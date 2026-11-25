import { env } from "cloudflare:workers"

import { parse } from "jsonc-parser"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { createEdgeCache } from "~/src/platform/testing/mocks/cache"

import { POLAR_SERVER } from "~/src/integrations/polar/polar.constants"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { COUNTRY_HEADER, HTTPS_SECURITY_HEADERS, HTTP_STATUS, SECURITY_HEADERS } from "~/src/modules/_core/constants/api"
import { COURSE_COVER_PATH_PREFIX } from "~/src/modules/course/course.cover"
import { bundleObjectKey, signBundle } from "~/src/modules/license/license.bundles"
import { BUNDLE_PATH_PREFIX } from "~/src/modules/license/license.constants"
import { PPP_ATTRIBUTE } from "~/src/modules/license/license.pricing"
import { MEDIA_PATH_PREFIX } from "~/src/modules/video/video.constants"

import { documentPolicy } from "~/src/lib/content-security-policy"

import * as ROUTES from "~/src/routes"
import worker from "~/src/server"

const fetchHandler = vi.hoisted(() => vi.fn<(request: Request, options: { context: { nonce: string } }) => Promise<Response>>())

const rewriteHandlers = vi.hoisted(() => vi.fn<(selector: string, handlers: HTMLRewriterElementContentHandlers) => void>())
const transformPage = vi.hoisted(() => vi.fn<(page: Response) => Response>())

class TestHTMLRewriter {
  on(selector: string, handlers: HTMLRewriterElementContentHandlers): this {
    rewriteHandlers(selector, handlers)
    return this
  }

  transform(page: Response): Response {
    return transformPage(page)
  }
}

vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch: fetchHandler } }))

beforeEach(() => {
  vi.stubEnv("DEV", false)
  vi.stubGlobal("HTMLRewriter", TestHTMLRewriter)
  rewriteHandlers.mockReset()
  transformPage.mockReset()
  transformPage.mockImplementation((page) => page)
  fetchHandler.mockReset()
  fetchHandler.mockResolvedValue(new Response("rendered", { headers: { "Set-Cookie": "session=kept" } }))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
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
  expect(first.headers.get(POLICY_HEADER)).toBe(documentPolicy(renderedNonce(0), env.POLAR_SERVER))
  expect(second.headers.get(POLICY_HEADER)).toBe(documentPolicy(renderedNonce(1), env.POLAR_SERVER))
  expect(first.headers.get(POLICY_HEADER)).toContain("frame-ancestors 'none'")
})

it.each([
  { origin: "https://polar.sh", server: POLAR_SERVER.PRODUCTION },
  { origin: "https://sandbox.polar.sh", server: POLAR_SERVER.SANDBOX },
])("lets a page of a Worker on the Polar $server server frame only that server's checkout", async ({ origin, server }) => {
  const response = await worker.fetch(new Request("http://localhost/app/license"), { ...env, POLAR_SERVER: server })

  expect(response.headers.get(POLICY_HEADER)).toContain(`; frame-src ${origin};`)
})

it("renders pages on the dev server under the base policy, because Vite's own inline scripts carry no nonce", async () => {
  vi.stubEnv("DEV", true)
  const request = new Request("http://localhost/auth/sign-in")

  const response = await worker.fetch(request, env)

  expect(response.headers.get(POLICY_HEADER)).toBe(BASE_POLICY)
  expect(fetchHandler).toHaveBeenCalledExactlyOnceWith(request, { context: { nonce: renderedNonce(0) } })
})

const prerenderedPage = (): Response =>
  new Response("<html>Page</html>", {
    headers: { "Cache-Control": "public, max-age=0, must-revalidate", "Content-Type": "text/html", ETag: '"page"' },
  })

const nonceOnScripts = async (): Promise<unknown[][]> => {
  const handlers = new Map(rewriteHandlers.mock.calls).get('script:not([type="application/ld+json"])')
  const setAttribute = vi.fn()
  if (!handlers?.element) {
    throw new Error("The Worker registered no script handler")
  }
  await Reflect.apply(handlers.element.bind(handlers), handlers, [{ setAttribute }])
  return setAttribute.mock.calls
}

const policyNonce = (response: Response): string =>
  /'nonce-(?<nonce>[\da-f]{32})'/u.exec(response.headers.get(POLICY_HEADER) ?? "")?.groups?.["nonce"] ?? ""

it("gives every prerendered page a nonce of its own in the header, and on the scripts of its HTML, as Cloudflare's edge needs", async () => {
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(prerenderedPage()).mockResolvedValueOnce(prerenderedPage())

  const first = await worker.fetch(new Request("http://localhost/docs"), env)
  const firstScripts = await nonceOnScripts()
  rewriteHandlers.mockClear()
  const second = await worker.fetch(new Request("http://localhost/docs"), env)

  expect(first.headers.get(POLICY_HEADER)).toBe(documentPolicy(policyNonce(first), env.POLAR_SERVER))
  expect(policyNonce(second)).not.toBe(policyNonce(first))
  expect(firstScripts).toStrictEqual([["nonce", policyNonce(first)]])
  expect(await nonceOnScripts()).toStrictEqual([["nonce", policyNonce(second)]])
  expect(fetchHandler).not.toHaveBeenCalled()
})

it.each(["prerendered", "rendered"])(
  "keeps no validator on %s HTML and makes it private, so no cached copy is reused with another response's nonce",
  async (source) => {
    if (source === "prerendered") {
      vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(prerenderedPage())
    } else {
      fetchHandler.mockResolvedValueOnce(prerenderedPage())
    }

    const response = await worker.fetch(new Request("http://localhost/docs"), env)

    expect(headersNamed(response, ["cache-control", "content-length", "etag", "last-modified"])).toStrictEqual({
      "cache-control": "private, no-cache",
      "content-length": null,
      etag: null,
      "last-modified": null,
    })
  },
)

it.each([
  { kind: "asset that is not HTML", url: "http://localhost/images/hero.png" },
  { kind: "locale redirect", url: "http://localhost/pl/docs" },
  { kind: "file the Worker serves itself", url: `http://localhost${MEDIA_PATH_PREFIX}/videos/unsigned/master.m3u8` },
])("keeps a $kind on the base policy and rewrites nothing", async ({ kind, url }) => {
  if (kind === "asset that is not HTML") {
    vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(new Response("image", { headers: { "Content-Type": "image/png" } }))
  }

  const response = await worker.fetch(new Request(url), env)

  expect(response.headers.get(POLICY_HEADER)).toBe(BASE_POLICY)
  expect(rewriteHandlers).not.toHaveBeenCalled()
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
  expect(response.status).toBe(HTTP_STATUS.PERMANENT_REDIRECT)
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

it.each(["prerendered", "rendered"])("preloads the fonts for %s HTML, keeping the links and cookies the response set", async (source) => {
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
    '</fonts/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin=anonymous',
    '</fonts/797e433ab948586e-s.0r6juujl39pe6.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin=anonymous',
  ])
  expect(response.headers.get("set-cookie")).toBe("session=kept; HttpOnly")
})

it("hints only the fonts, whose files keep their names across deploys, because Cloudflare replays a page's last Link header as Early Hints after the next deploy", async () => {
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(new Response("<html>Page</html>", { headers: { "Content-Type": "text/html" } }))

  const response = await worker.fetch(new Request("https://localhost/docs"), env)

  expect(
    response.headers
      .get("link")
      ?.split(", ")
      .every((link) => link.startsWith("</fonts/")),
  ).toBe(true)
})

it.each([
  ["/pl-PL/docs", "7178b3e590c64307-s.p.21jp631_3pja2.woff2"],
  ["/uk-UA/docs", "8a480f0b521d4e75-s.1qq4vpdcun5oj.woff2"],
])("preloads the additional font subset matching %s", async (pathname, font) => {
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(new Response("<html>Page</html>", { headers: { "Content-Type": "text/html" } }))

  const response = await worker.fetch(new Request(`https://localhost${pathname}`), env)

  expect(response.headers.get("link")?.split(", ")).toEqual([
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

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(await response.text()).toBe("<html>API response</html>")
  expect(response.headers.get("link")).toBeNull()
})

it.each([HTTP_STATUS.NOT_FOUND, HTTP_STATUS.INTERNAL_SERVER_ERROR])(
  "does not attach document preloads to rendered HTML errors with status %s",
  async (status) => {
    const html = new Response("<html>Error</html>", { headers: { "Content-Type": "text/html" }, status })
    fetchHandler.mockResolvedValueOnce(html)

    const response = await worker.fetch(new Request("https://localhost/missing"), env)

    expect(response.status).toBe(status)
    expect(await response.text()).toBe("<html>Error</html>")
    expect(response.headers.get("link")).toBeNull()
  },
)

it.each(["HEAD", "POST"])("preserves %s requests when no prerendered document applies", async (method) => {
  const response = await worker.fetch(new Request("http://localhost/docs", { method }), env)
  expect(await response.text()).toBe("rendered")
  expect(fetchHandler).toHaveBeenCalledOnce()
})

it.each([
  { body: null, contentType: "text/html", status: HTTP_STATUS.NOT_MODIFIED },
  { body: "asset", contentType: "text/html", status: HTTP_STATUS.SERVICE_UNAVAILABLE },
  { body: "asset", contentType: "image/png", status: HTTP_STATUS.OK },
  { body: "asset", contentType: null, status: HTTP_STATUS.OK },
])("hands a $contentType response with status $status to no document handler", async ({ body, contentType, status }) => {
  const asset = new Response(body, { status })
  asset.headers.delete("Content-Type")
  if (contentType !== null) {
    asset.headers.set("Content-Type", contentType)
  }
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(asset)

  const response = await worker.fetch(new Request("http://localhost/images/hero.png", { headers: { [COUNTRY_HEADER]: "PL" } }), env)

  expect(response.status).toBe(status)
  expect(response.headers.get("content-type")).toBe(contentType)
  expect(await response.text()).toBe(body ?? "")
  expect(rewriteHandlers).not.toHaveBeenCalled()
})

const runElementHandler = async (selector: string, element: object): Promise<void> => {
  const handlers = new Map(rewriteHandlers.mock.calls).get(selector)
  if (!handlers?.element) {
    throw new Error(`The Worker registered no ${selector} element handler`)
  }
  await Reflect.apply(handlers.element.bind(handlers), handlers, [element])
}

it.each([
  { pathname: "/docs", source: "prerendered", style: '--ppp-region:"Poland";--ppp-percent:"30%"' },
  { pathname: "/pl-PL/docs", source: "prerendered", style: '--ppp-region:"Polska";--ppp-percent:"30%"' },
  { pathname: "/de-DE/auth/sign-in", source: "rendered", style: '--ppp-region:"Polen";--ppp-percent:"30\u00A0%"' },
])("offers the regional price on $source HTML at $pathname in the locale of the page", async ({ pathname, source, style }) => {
  const html = new Response("<html>Page</html>", { headers: { "Content-Type": "text/html" } })
  if (source === "prerendered") {
    vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(html)
    transformPage.mockImplementationOnce((page) => page)
  } else {
    fetchHandler.mockResolvedValueOnce(html)
  }
  transformPage.mockImplementationOnce(() => new Response("regional page"))

  const response = await worker.fetch(new Request(`http://localhost${pathname}`, { headers: { [COUNTRY_HEADER]: "PL" } }), env)
  const setAttribute = vi.fn()
  await runElementHandler("html", { setAttribute })

  expect(await response.text()).toBe("regional page")
  expect(transformPage.mock.calls.at(-1)?.[0].headers.get("link")).toContain(
    "</fonts/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2>; rel=preload",
  )
  expect(setAttribute.mock.calls).toStrictEqual([
    [PPP_ATTRIBUTE, "70"],
    ["style", style],
  ])
  expect(headersNamed(response, Object.keys(OTHER_SECURITY_HEADERS))).toStrictEqual(OTHER_SECURITY_HEADERS)
})

it("serves a course cover itself, without the locale middleware or TanStack Start", async () => {
  createEdgeCache()
  const cover = "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/0195a2b4-6c8d-7e9f-8a0b-00000000c0e1.webp"
  await env.MEDIA.put(cover, "RIFF")

  const response = await worker.fetch(
    new Request(`https://localhost${MEDIA_PATH_PREFIX}/${cover}`, { headers: { cookie: `${I18N.COOKIE_NAME}=pl-PL` } }),
    env,
  )

  expect(COURSE_COVER_PATH_PREFIX.startsWith(`${MEDIA_PATH_PREFIX}/`)).toBe(true)
  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(await response.text()).toBe("RIFF")
  expect(response.headers.get("content-type")).toBe("image/webp")
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(headersNamed(response, Object.keys(HTTPS_SECURITY_HEADERS))).toStrictEqual(HTTPS_SECURITY_HEADERS)
  expect(fetchHandler).not.toHaveBeenCalled()
})

it("writes the course sitemap itself, without the locale middleware or TanStack Start", async () => {
  const response = await worker.fetch(new Request(`https://localhost${ROUTES.COURSES_SITEMAP}`, { method: "HEAD" }), env)

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8")
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(fetchHandler).not.toHaveBeenCalled()
})

it("streams signed media itself, without the locale middleware or TanStack Start", async () => {
  createEdgeCache()
  const { createPlayback } = await import("~/src/modules/video/video.playback")
  const videoId = "0195a2b4-6c8d-7e9f-8a0b-1c2d3e4f5a6b"
  await env.MEDIA.put(`videos/${videoId}/master.m3u8`, "#EXTM3U\n")
  const { src } = await createPlayback({ now: Date.now(), secret: env.AUTH_SECRET, video: { captionLocales: [], id: videoId } })

  const response = await worker.fetch(new Request(`https://localhost${src}`, { headers: { cookie: `${I18N.COOKIE_NAME}=pl-PL` } }), env)

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(await response.text()).toBe("#EXTM3U\n")
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  expect(fetchHandler).not.toHaveBeenCalled()
})

it("serves a signed lesson download itself, without the locale middleware or TanStack Start", async () => {
  const { signDownload } = await import("~/src/modules/lesson-attachment/lesson-attachment.download")
  const { attachmentObjectKey } = await import("~/src/modules/lesson-attachment/lesson-attachment.files")
  const attachmentId = "0195a2b4-6c8d-7e9f-8a0b-00000000a0a1"
  const objectKey = attachmentObjectKey({ attachmentId, fileName: "notes.md" })
  await env.MEDIA.put(objectKey, "# Notes\n")
  const path = await signDownload({ attachmentId, now: Date.now(), objectKey, secret: env.AUTH_SECRET })

  const response = await worker.fetch(new Request(`https://localhost${path}`, { headers: { cookie: `${I18N.COOKIE_NAME}=pl-PL` } }), env)

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(await response.text()).toBe("# Notes\n")
  expect(response.headers.get("content-disposition")).toBe('attachment; filename="notes.md"')
  expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  expect(fetchHandler).not.toHaveBeenCalled()
})

it("streams a signed template bundle itself, without the locale middleware or TanStack Start", async () => {
  const version = "0.1.0"
  await env.BUNDLES.put(bundleObjectKey(version), "archive")
  const { url } = await signBundle({ host: "localhost", now: Date.now(), secret: env.AUTH_SECRET, version })

  const response = await worker.fetch(new Request(url, { headers: { cookie: `${I18N.COOKIE_NAME}=pl-PL` } }), env)

  expect(new URL(url).pathname.startsWith(`${BUNDLE_PATH_PREFIX}/`)).toBe(true)
  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(await response.text()).toBe("archive")
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  expect(fetchHandler).not.toHaveBeenCalled()
})

it("delegates request observability to Cloudflare", () => {
  const config: unknown = parse(readFileSync("wrangler.jsonc", "utf8"))
  expect(config).toHaveProperty("observability.enabled", true)
})
