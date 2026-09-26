import { env } from "cloudflare:workers"

import { parse } from "jsonc-parser"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { DOCUMENT_STYLESHEET } from "~/src/presentation/document-assets"
import worker from "~/src/server"

const fetchHandler = vi.hoisted(() => vi.fn<(request: Request) => Promise<Response>>())
vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch: fetchHandler } }))
const rewriteHandlers = vi.fn<(selector: string, handlers: HTMLRewriterElementContentHandlers) => void>()
const transformAsset = vi.fn<(asset: Response) => Response>()

class TestHTMLRewriter {
  on(selector: string, handlers: HTMLRewriterElementContentHandlers): this {
    rewriteHandlers(selector, handlers)
    return this
  }

  transform(asset: Response): Response {
    return transformAsset(asset)
  }
}

const runElementHandler = async (selector: string, element: object): Promise<void> => {
  const handlers = new Map(rewriteHandlers.mock.calls).get(selector)
  if (!handlers?.element) {
    throw new Error(`The Worker did not register a ${selector} element handler`)
  }
  await Reflect.apply(handlers.element.bind(handlers), handlers, [element])
}

beforeEach(() => {
  fetchHandler.mockReset()
  fetchHandler.mockResolvedValue(new Response("rendered", { headers: { "Set-Cookie": "session=kept" } }))
  rewriteHandlers.mockReset()
  transformAsset.mockReset()
  vi.stubGlobal("HTMLRewriter", TestHTMLRewriter)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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
  expect(fetchHandler).toHaveBeenCalledExactlyOnceWith(request)
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
        "Content-Security-Policy": "default-src 'self'",
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
    expect(response.headers.get("content-security-policy")).toBe("default-src 'self'")
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

  expect(response).toBe(html)
  expect(response.headers.get("link")).toBeNull()
})

it.each([404, 500])("does not attach document preloads to rendered HTML errors with status %s", async (status) => {
  const html = new Response("<html>Error</html>", { headers: { "Content-Type": "text/html" }, status })
  fetchHandler.mockResolvedValueOnce(html)

  const response = await worker.fetch(new Request("https://localhost/missing"), env)

  expect(response).toBe(html)
  expect(response.headers.get("link")).toBeNull()
})

it.each(["HEAD", "POST"])("preserves %s requests when no prerendered document applies", async (method) => {
  const response = await worker.fetch(new Request("http://localhost/docs", { method }), env)
  expect(await response.text()).toBe("rendered")
  expect(fetchHandler).toHaveBeenCalledOnce()
})

const regionalPage = (headers: Record<string, string> = {}): Response =>
  new Response("<html>Page</html>", {
    headers: {
      "Content-Length": "17",
      "Content-Type": "text/html",
      ETag: '"page"',
      "Last-Modified": "Sun, 13 Sep 2026 12:00:00 GMT",
      ...headers,
    },
  })

it.each([undefined, "US", "XX"])("leaves every page unchanged for a full-price or unknown country: %j", async (country) => {
  const assets = vi.spyOn(env.ASSETS, "fetch")
  for (const pathname of ["/", "/pl-PL", "/pl-PL/docs", "/terms"]) {
    const html = "<html><body>Unchanged page</body></html>"
    assets.mockResolvedValueOnce(new Response(html, { headers: { "Content-Type": "text/html", ETag: '"page"' } }))
    const headers = country === undefined ? {} : { "cf-ipcountry": country }
    const response = await worker.fetch(new Request(`http://localhost${pathname}`, { headers }), env)

    expect(await response.text()).toBe(html)
    expect(response.headers.get("etag")).toBe('"page"')
  }

  expect(rewriteHandlers).not.toHaveBeenCalled()
  expect(transformAsset).not.toHaveBeenCalled()
})

it.each([
  { pathname: "/", style: '--ppp-region:"Poland";--ppp-percent:"30%"' },
  { pathname: "/pl-PL/docs", style: '--ppp-region:"Polska";--ppp-percent:"30%"' },
  { pathname: "/de-DE/blog/post", style: '--ppp-region:"Polen";--ppp-percent:"30\u00A0%"' },
])("shows regional pricing on $pathname in the page language", async ({ pathname, style }) => {
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(regionalPage({ "Set-Cookie": "asset=kept; HttpOnly" }))
  transformAsset.mockImplementationOnce((page) => new Response("regional page", page))

  const response = await worker.fetch(new Request(`http://localhost${pathname}`, { headers: { "cf-ipcountry": "pl" } }), env)

  const setAttribute = vi.fn()
  await runElementHandler("html", { setAttribute })
  expect(setAttribute.mock.calls).toEqual([
    ["data-ppp", "70"],
    ["style", style],
  ])
  expect(await response.text()).toBe("regional page")
  expect(response.headers.get("cache-control")).toBe("private, no-cache")
  expect(response.headers.get("content-length")).toBeNull()
  expect(response.headers.get("etag")).toBeNull()
  expect(response.headers.get("last-modified")).toBeNull()
  expect(response.headers.get("link")).toContain(`<${DOCUMENT_STYLESHEET.href}>; rel=preload; as=style`)
  expect(response.headers.get("set-cookie")).toContain("asset=kept; HttpOnly")
  const removeAttribute = vi.fn()
  await runElementHandler(".ppp-offer input", { removeAttribute })
  expect(removeAttribute).not.toHaveBeenCalled()
})

it("renders a stored decline with the regional pricing checkbox unchecked", async () => {
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(regionalPage())
  transformAsset.mockImplementationOnce((page) => page)

  await worker.fetch(new Request("http://localhost/", { headers: { "cf-ipcountry": "PL", cookie: "regional_pricing=off" } }), env)

  const removeAttribute = vi.fn()
  await runElementHandler(".ppp-offer input", { removeAttribute })
  expect(removeAttribute).toHaveBeenCalledExactlyOnceWith("checked")
})

it("shows regional pricing on server-rendered pages", async () => {
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(new Response("missing", { status: 404 }))
  fetchHandler.mockResolvedValueOnce(regionalPage())
  transformAsset.mockImplementationOnce(() => new Response("regional sign-in"))

  const response = await worker.fetch(new Request("http://localhost/auth/sign-in", { headers: { "cf-ipcountry": "PL" } }), env)

  expect(await response.text()).toBe("regional sign-in")
  expect(transformAsset).toHaveBeenCalledOnce()
})

it.each([
  { contentType: "text/html", status: 304 },
  { contentType: "text/html", status: 503 },
  { contentType: "image/png", status: 200 },
  { contentType: undefined, status: 200 },
])("passes a regional $contentType response with status $status through unchanged", async ({ contentType, status }) => {
  const asset = new Response(status === 304 ? null : "asset", { status })
  asset.headers.delete("Content-Type")
  if (contentType !== undefined) {
    asset.headers.set("Content-Type", contentType)
  }
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(asset)

  const response = await worker.fetch(new Request("http://localhost/images/hero.png", { headers: { "cf-ipcountry": "PL" } }), env)

  expect(response).toBe(asset)
  expect(transformAsset).not.toHaveBeenCalled()
})

it("delegates request observability to Cloudflare", () => {
  const config: unknown = parse(readFileSync("wrangler.jsonc", "utf8"))
  expect(config).toHaveProperty("observability.enabled", true)
})
