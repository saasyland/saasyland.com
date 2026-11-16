import { env } from "cloudflare:workers"

import { parse } from "jsonc-parser"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { HTTPS_SECURITY_HEADERS, SECURITY_HEADERS } from "~/src/modules/_core/constants/api"

import { renderedPagePolicy } from "~/src/lib/content-security-policy"

import { DOCUMENT_STYLESHEET } from "~/src/presentation/document-assets"
import worker from "~/src/server"

const AREA_PATH_PREFIX = vi.hoisted(() => "/area-files/")
const fetchHandler = vi.hoisted(() => vi.fn<(request: Request, options: { context: { nonce: string } }) => Promise<Response>>())
const areaFetch = vi.hoisted(() => vi.fn<(request: Request) => Promise<Response>>())
const areaRewrite = vi.hoisted(() => vi.fn<(document: Response, context: { locale: string; request: Request }) => Response>())

vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch: fetchHandler } }))
vi.mock("~/src/data/worker.entries", async () => {
  const { WORKER_HANDLER_KIND } = await import("~/src/data/worker.constants")

  return {
    TEST_WORKER_HANDLERS: [
      { kind: WORKER_HANDLER_KIND.DOCUMENT, rewrite: areaRewrite },
      { fetch: areaFetch, kind: WORKER_HANDLER_KIND.REQUEST, pathPrefix: AREA_PATH_PREFIX },
    ],
  }
})

beforeEach(() => {
  vi.stubEnv("DEV", false)
  fetchHandler.mockReset()
  fetchHandler.mockResolvedValue(new Response("rendered", { headers: { "Set-Cookie": "session=kept" } }))
  areaFetch.mockReset()
  areaFetch.mockResolvedValue(new Response("area file"))
  areaRewrite.mockReset()
  areaRewrite.mockImplementation((document) => document)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})
const HEADER_LINE_PATTERN = /^ {2}(?<name>[^:]+): (?<value>.+)$/u

const headerEntry = (line: string): [string, string][] => {
  const { name, value } = HEADER_LINE_PATTERN.exec(line)?.groups ?? {}

  return name === undefined || value === undefined ? [] : [[name, value]]
}

const staticFileHeaders = (pattern: string): Record<string, string> => {
  const rule = readFileSync("public/_headers", "utf8")
    .split("\n\n")
    .find((block) => block.startsWith(`${pattern}\n`))

  return Object.fromEntries((rule ?? "").split("\n").flatMap((line) => headerEntry(line)))
}

const headersNamed = (response: Response, names: readonly string[]): Record<string, string | null> =>
  Object.fromEntries(names.map((name) => [name, response.headers.get(name)]))

const POLICY_HEADER = "Content-Security-Policy"

const { [POLICY_HEADER]: BASE_POLICY, ...OTHER_SECURITY_HEADERS } = SECURITY_HEADERS

const renderedNonce = (call: number): string => fetchHandler.mock.calls[call]?.[1].context.nonce ?? ""

it.each([
  { kind: "page", url: "http://localhost/" },
  { kind: "API", url: "http://localhost/api/auth/session" },
  { kind: "locale redirect", url: "http://localhost/pl/docs" },
])("sends the security headers with a $kind response", async ({ url }) => {
  const response = await worker.fetch(new Request(url), env)

  expect(headersNamed(response, Object.keys(OTHER_SECURITY_HEADERS))).toStrictEqual(OTHER_SECURITY_HEADERS)
  expect(response.headers.get(POLICY_HEADER)?.split("; ")).toEqual(expect.arrayContaining(BASE_POLICY.split("; ")))
})

it("gives every page the Worker renders a script policy with a nonce of its own, and hands that nonce to TanStack Start", async () => {
  const first = await worker.fetch(new Request("http://localhost/auth/sign-in"), env)
  const second = await worker.fetch(new Request("http://localhost/auth/sign-in"), env)

  expect(renderedNonce(0)).toMatch(/^[\da-f]{32}$/u)
  expect(renderedNonce(1)).not.toBe(renderedNonce(0))
  expect(first.headers.get(POLICY_HEADER)).toBe(renderedPagePolicy(renderedNonce(0)))
  expect(second.headers.get(POLICY_HEADER)).toBe(renderedPagePolicy(renderedNonce(1)))
  expect(first.headers.get(POLICY_HEADER)).toContain("frame-ancestors 'none'")
})

it("renders pages on the dev server under the base policy, because Vite's own inline scripts carry no nonce", async () => {
  vi.stubEnv("DEV", true)
  const request = new Request("http://localhost/auth/sign-in")

  const response = await worker.fetch(request, env)

  expect(response.headers.get(POLICY_HEADER)).toBe(BASE_POLICY)
  expect(fetchHandler).toHaveBeenCalledExactlyOnceWith(request, { context: { nonce: renderedNonce(0) } })
})

it.each([
  { kind: "prerendered page", url: "http://localhost/docs" },
  { kind: "locale redirect", url: "http://localhost/pl/docs" },
  { kind: "file an area serves", url: `http://localhost${AREA_PATH_PREFIX}bundle.tgz` },
])("keeps a $kind on the base policy, because prerendered pages carry their script hashes themselves", async ({ kind, url }) => {
  if (kind === "prerendered page") {
    vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(new Response("<html>Page</html>", { headers: { "Content-Type": "text/html" } }))
  }

  const response = await worker.fetch(new Request(url), env)

  expect(response.headers.get(POLICY_HEADER)).toBe(BASE_POLICY)
  expect(fetchHandler).not.toHaveBeenCalled()
})

it("replaces a security header that an asset rule or the response already set, so the Worker's set is the only one", async () => {
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(
    new Response("static page", { headers: { "Content-Security-Policy": "default-src *", "X-Frame-Options": "SAMEORIGIN" } }),
  )

  const response = await worker.fetch(new Request("http://localhost/docs"), env)

  expect(headersNamed(response, Object.keys(SECURITY_HEADERS))).toStrictEqual(SECURITY_HEADERS)
})

it("asks browsers to keep using HTTPS only on HTTPS responses", async () => {
  const secure = await worker.fetch(new Request("https://example.com/"), env)
  const local = await worker.fetch(new Request("http://localhost/"), env)

  expect(headersNamed(secure, Object.keys(HTTPS_SECURITY_HEADERS))).toStrictEqual(HTTPS_SECURITY_HEADERS)
  expect(local.headers.get("strict-transport-security")).toBeNull()
})

it("gives static files served without the Worker exactly the Worker's HTTPS security headers", () => {
  expect(staticFileHeaders("/*")).toStrictEqual({ ...SECURITY_HEADERS, ...HTTPS_SECURITY_HEADERS })
})

it("canonicalizes locale aliases before rendering", async () => {
  const response = await worker.fetch(new Request("http://localhost/pl/docs?search=one"), env)
  expect(response.status).toBe(308)
  expect(response.headers.get("location")).toBe("http://localhost/pl-PL/docs?search=one")
  expect(response.headers.get("link")).toBeNull()
  expect(fetchHandler).not.toHaveBeenCalled()
})
it("renders a page without a prerendered asset through TanStack Start", async () => {
  const request = new Request("http://localhost/")
  const response = await worker.fetch(request, env)
  expect(await response.text()).toBe("rendered")
  expect(fetchHandler).toHaveBeenCalledExactlyOnceWith(request, { context: { nonce: renderedNonce(0) } })
})
it("sets the document locale without discarding authentication cookies", async () => {
  const response = await worker.fetch(new Request("http://localhost/pl-PL/docs"), env)
  expect(response.headers.get("set-cookie")).toContain(`${I18N.COOKIE_NAME}=pl-PL`)
  expect(response.headers.get("set-cookie")).toContain("session=kept")
  expect(await response.text()).toBe("rendered")
})
it("leaves API requests and their cookies to the handler", async () => {
  const response = await worker.fetch(
    new Request("http://localhost/api/auth/session", { headers: { cookie: `${I18N.COOKIE_NAME}=pl-PL` } }),
    env,
  )
  expect(response.headers.get("set-cookie")).toBe("session=kept")
})

it.each([
  ["/@id/virtual:tanstack-start-dev-client-entry", "script", "application/javascript"],
  ["/src/presentation/styles/globals.css", "style", "text/css"],
  ["/@tanstack-start/styles.css?routes=__root__", "style", "text/css"],
])("serves %s without resetting the visitor's locale cookie", async (pathname, destination, contentType) => {
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(new Response("asset contents", { headers: { "Content-Type": contentType } }))
  const response = await worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "*/*", cookie: `${I18N.COOKIE_NAME}=pl-PL`, "sec-fetch-dest": destination },
    }),
    env,
  )

  expect(response.headers.get("set-cookie")).toBeNull()
  expect(response.headers.get("content-type")).toBe(contentType)
  expect(await response.text()).toBe("asset contents")
  expect(fetchHandler).not.toHaveBeenCalled()
})

it("serves prerendered HTML through the locale middleware without rerendering", async () => {
  const assets = vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(new Response("static Polish page"))
  const response = await worker.fetch(new Request("http://localhost/pl-PL/docs"), env)
  expect(await response.text()).toBe("static Polish page")
  expect(response.headers.get("set-cookie")).toContain(`${I18N.COOKIE_NAME}=pl-PL`)
  expect(fetchHandler).not.toHaveBeenCalled()
  assets.mockRestore()
})

it.each(["prerendered", "rendered"])(
  "preloads the document stylesheet and fonts for %s HTML while preserving response headers",
  async (source) => {
    const html = new Response("<html>Page</html>", {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Length": "17",
        "Content-Type": "text/html; charset=utf-8",
        ETag: '"page"',
        Link: "</feed.xml>; rel=alternate",
        "Set-Cookie": "session=kept; HttpOnly",
      },
    })
    if (source === "prerendered") {
      vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(html)
    } else {
      fetchHandler.mockResolvedValueOnce(html)
    }

    const response = await worker.fetch(new Request("https://localhost/docs"), env)

    expect(response.body).toBe(html.body)
    expect(await response.text()).toBe("<html>Page</html>")
    expect(response.headers.get("link")?.split(", ")).toEqual([
      "</feed.xml>; rel=alternate",
      `<${DOCUMENT_STYLESHEET.href}>; rel=preload; as=style`,
      '</fonts/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin=anonymous',
      '</fonts/797e433ab948586e-s.0r6juujl39pe6.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin=anonymous',
    ])
    expect(response.headers.get("cache-control")).toBe(html.headers.get("cache-control"))
    expect(response.headers.get("content-length")).toBe("17")
    expect(response.headers.get("etag")).toBe('"page"')
    expect(response.headers.get("set-cookie")).toBe("session=kept; HttpOnly")
  },
)

it.each([
  ["/pl-PL/docs", "7178b3e590c64307-s.p.21jp631_3pja2.woff2"],
  ["/uk-UA/docs", "8a480f0b521d4e75-s.1qq4vpdcun5oj.woff2"],
])("preloads the additional font subset matching %s", async (pathname, font) => {
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(new Response("<html>Page</html>", { headers: { "Content-Type": "text/html" } }))

  const response = await worker.fetch(new Request(`https://localhost${pathname}`), env)

  expect(response.headers.get("link")?.split(", ")).toEqual([
    `<${DOCUMENT_STYLESHEET.href}>; rel=preload; as=style`,
    '</fonts/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin=anonymous',
    '</fonts/797e433ab948586e-s.0r6juujl39pe6.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin=anonymous',
    `</fonts/${font}>; rel=preload; as=font; type="font/woff2"; crossorigin=anonymous`,
  ])
  expect(response.headers.get("set-cookie")).toContain("Secure")
})

it.each(["/api/example", "/_serverFn/example"])("does not attach document preloads to %s even for HTML responses", async (pathname) => {
  const html = new Response("<html>API response</html>", { headers: { "Content-Type": "text/html" } })
  fetchHandler.mockResolvedValueOnce(html)

  const response = await worker.fetch(new Request(`https://localhost${pathname}`), env)

  expect(response.status).toBe(200)
  expect(await response.text()).toBe("<html>API response</html>")
  expect(response.headers.get("link")).toBeNull()
})

it.each([404, 500])("does not attach document preloads to rendered HTML errors with status %s", async (status) => {
  const html = new Response("<html>Error</html>", { headers: { "Content-Type": "text/html" }, status })
  fetchHandler.mockResolvedValueOnce(html)

  const response = await worker.fetch(new Request("https://localhost/missing"), env)

  expect(response.status).toBe(status)
  expect(await response.text()).toBe("<html>Error</html>")
  expect(response.headers.get("link")).toBeNull()
})

it.each(["HEAD", "POST"])("preserves %s requests when no prerendered document applies", async (method) => {
  const response = await worker.fetch(new Request("http://localhost/docs", { method }), env)
  expect(await response.text()).toBe("rendered")
  expect(fetchHandler).toHaveBeenCalledOnce()
})

it.each([
  { contentType: "text/html", status: 304 },
  { contentType: "text/html", status: 503 },
  { contentType: "image/png", status: 200 },
  { contentType: undefined, status: 200 },
])("hands a $contentType response with status $status to no document handler", async ({ contentType, status }) => {
  const asset = new Response(status === 304 ? null : "asset", { status })
  asset.headers.delete("Content-Type")
  if (contentType !== undefined) {
    asset.headers.set("Content-Type", contentType)
  }
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(asset)

  const response = await worker.fetch(new Request("http://localhost/images/hero.png"), env)

  expect(response.status).toBe(status)
  expect(response.headers.get("content-type")).toBe(contentType ?? null)
  expect(await response.text()).toBe(status === 304 ? "" : "asset")
  expect(areaRewrite).not.toHaveBeenCalled()
})

it.each([
  { locale: I18N.DEFAULT_LOCALE, pathname: "/docs", source: "prerendered" },
  { locale: "pl-PL", pathname: "/pl-PL/docs", source: "prerendered" },
  { locale: "de-DE", pathname: "/de-DE/auth/sign-in", source: "rendered" },
])("hands $source HTML at $pathname to the document handlers of the areas with its locale", async ({ locale, pathname, source }) => {
  const html = new Response("<html>Page</html>", { headers: { "Content-Type": "text/html" } })
  if (source === "prerendered") {
    vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(html)
  } else {
    fetchHandler.mockResolvedValueOnce(html)
  }
  areaRewrite.mockImplementationOnce(() => new Response("rewritten page"))
  const request = new Request(`http://localhost${pathname}`)

  const response = await worker.fetch(request, env)

  expect(await response.text()).toBe("rewritten page")
  expect(areaRewrite).toHaveBeenCalledExactlyOnceWith(expect.any(Response), { locale, request })
  expect(areaRewrite.mock.calls[0]?.[0].headers.get("link")).toContain(`<${DOCUMENT_STYLESHEET.href}>; rel=preload; as=style`)
  expect(headersNamed(response, Object.keys(OTHER_SECURITY_HEADERS))).toStrictEqual(OTHER_SECURITY_HEADERS)
})

it("answers a path an area claims with that area's handler, without the locale middleware or TanStack Start", async () => {
  const request = new Request(`https://localhost${AREA_PATH_PREFIX}file.txt`, { headers: { cookie: `${I18N.COOKIE_NAME}=pl-PL` } })

  const response = await worker.fetch(request, env)

  expect(await response.text()).toBe("area file")
  expect(areaFetch).toHaveBeenCalledExactlyOnceWith(request)
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(headersNamed(response, Object.keys(HTTPS_SECURITY_HEADERS))).toStrictEqual(HTTPS_SECURITY_HEADERS)
  expect(fetchHandler).not.toHaveBeenCalled()
  expect(areaRewrite).not.toHaveBeenCalled()
})

it("delegates request observability to Cloudflare", () => {
  const config: unknown = parse(readFileSync("wrangler.jsonc", "utf8"))
  expect(config).toHaveProperty("observability.enabled", true)
})
