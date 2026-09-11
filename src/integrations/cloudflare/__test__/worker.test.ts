import { env } from "cloudflare:workers"

import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { DOCUMENT_STYLESHEET } from "~/src/presentation/document-assets"
import worker, { type RequestContext } from "~/src/server"

const fetchHandler = vi.hoisted(() => vi.fn<(request: Request, options: { context: RequestContext }) => Promise<Response>>())
vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch: fetchHandler } }))
const context = { passThroughOnException: vi.fn(), waitUntil: vi.fn() }
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

const expectPricingAttribute = async (): Promise<void> => {
  const handlers = rewriteHandlers.mock.lastCall?.[1]
  const setAttribute = vi.fn()
  expect(rewriteHandlers.mock.lastCall?.[0]).toBe("html")
  if (!handlers?.element) {
    throw new Error("The Worker did not register an HTML element handler")
  }
  await Reflect.apply(handlers.element.bind(handlers), handlers, [{ setAttribute }])
  expect(setAttribute).toHaveBeenCalledExactlyOnceWith("data-ppp", "70")
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
  const response = await worker.fetch(new Request("http://localhost/pl/docs?search=one"), env, context)
  expect(response.status).toBe(308)
  expect(response.headers.get("location")).toBe("http://localhost/pl-PL/docs?search=one")
  expect(response.headers.get("link")).toBeNull()
  expect(fetchHandler).not.toHaveBeenCalled()
})
it("preserves the response and forwards Worker execution context", async () => {
  const request = new Request("http://localhost/")
  const response = await worker.fetch(request, env, context)
  expect(await response.text()).toBe("rendered")
  const forwarded = fetchHandler.mock.calls[0]?.[1].context
  expect(forwarded?.env).toBe(env)
  forwarded?.waitUntil(Promise.resolve())
  forwarded?.passThroughOnException()
  expect(context.waitUntil).toHaveBeenCalled()
  expect(context.passThroughOnException).toHaveBeenCalled()
})
it("sets the document locale without discarding authentication cookies", async () => {
  const response = await worker.fetch(new Request("http://localhost/pl-PL/docs"), env, context)
  expect(response.headers.get("set-cookie")).toContain(`${I18N.COOKIE_NAME}=pl-PL`)
  expect(response.headers.get("set-cookie")).toContain("session=kept")
  expect(await response.text()).toBe("rendered")
})
it("leaves API requests and their cookies to the handler", async () => {
  const response = await worker.fetch(
    new Request("http://localhost/api/auth/session", { headers: { cookie: `${I18N.COOKIE_NAME}=pl-PL` } }),
    env,
    context,
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
    context,
  )

  expect(response.headers.get("set-cookie")).toBeNull()
  expect(response.headers.get("content-type")).toBe(contentType)
  expect(await response.text()).toBe("asset contents")
  expect(fetchHandler).not.toHaveBeenCalled()
})

it("serves prerendered HTML through the locale middleware without rerendering", async () => {
  const assets = vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(new Response("static Polish page"))
  const response = await worker.fetch(new Request("http://localhost/pl-PL/docs"), env, context)
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

    const response = await worker.fetch(new Request("https://localhost/docs"), env, context)

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

  const response = await worker.fetch(new Request(`https://localhost${pathname}`), env, context)

  expect(response.headers.get("link")?.split(", ")).toEqual([
    `<${DOCUMENT_STYLESHEET.href}>; rel=preload; as=style`,
    '</fonts/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin=anonymous',
    '</fonts/797e433ab948586e-s.0r6juujl39pe6.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin=anonymous',
    `</fonts/${font}>; rel=preload; as=font; type="font/woff2"; crossorigin=anonymous`,
  ])
  expect(response.headers.get("set-cookie")).toContain("Secure")
})

it.each(["/api/example", "/rpc/example", "/_serverFn/example"])(
  "does not attach document preloads to %s even for HTML responses",
  async (pathname) => {
    const html = new Response("<html>API response</html>", { headers: { "Content-Type": "text/html" } })
    fetchHandler.mockResolvedValueOnce(html)

    const response = await worker.fetch(new Request(`https://localhost${pathname}`), env, context)

    expect(response).toBe(html)
    expect(response.headers.get("link")).toBeNull()
  },
)

it.each([404, 500])("does not attach document preloads to rendered HTML errors with status %s", async (status) => {
  const html = new Response("<html>Error</html>", { headers: { "Content-Type": "text/html" }, status })
  fetchHandler.mockResolvedValueOnce(html)

  const response = await worker.fetch(new Request("https://localhost/missing"), env, context)

  expect(response).toBe(html)
  expect(response.headers.get("link")).toBeNull()
})

it.each(["HEAD", "POST"])("preserves %s requests when no prerendered document applies", async (method) => {
  const response = await worker.fetch(new Request("http://localhost/docs", { method }), env, context)
  expect(await response.text()).toBe("rendered")
  expect(fetchHandler).toHaveBeenCalledOnce()
})

const expectRegionalHomepage = async ({
  asset,
  locale,
  response,
  rewritten,
}: {
  asset: Response
  locale: string
  response: Response
  rewritten: string
}): Promise<void> => {
  await expectPricingAttribute()
  expect(transformAsset.mock.lastCall?.[0].body).toBe(asset.body)
  expect(await response.text()).toBe(rewritten)
  expect(response.headers.get("content-type")).toBe("text/html")
  expect(response.headers.get("etag")).toBe('W/"homepage-70"')
  expect(response.headers.get("link")).toContain(`<${DOCUMENT_STYLESHEET.href}>; rel=preload; as=style`)
  expect(response.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate")
  expect(response.headers.get("set-cookie")).toContain("asset=kept; HttpOnly")
  if (locale !== I18N.DEFAULT_LOCALE) {
    expect(response.headers.get("set-cookie")).toContain(`${I18N.COOKIE_NAME}=${locale}`)
  }
}

it("sets the country pricing band on every prerendered homepage and preserves localized response headers", async () => {
  const assets = vi.spyOn(env.ASSETS, "fetch")

  for (const locale of I18N.SUPPORTED_LOCALES) {
    const pathname = locale === I18N.DEFAULT_LOCALE ? "/" : `/${locale}`
    const asset = new Response(`<html lang="${locale}"><body>Homepage</body></html>`, {
      headers: { "Content-Type": "text/html", ETag: '"homepage"', "Set-Cookie": "asset=kept; HttpOnly" },
    })
    const rewritten = `<html lang="${locale}" data-ppp="70"><body>Homepage</body></html>`
    assets.mockResolvedValueOnce(asset)
    transformAsset.mockImplementationOnce((input) => new Response(rewritten, input))

    const response = await worker.fetch(new Request(`http://localhost${pathname}`, { headers: { "cf-ipcountry": "PL" } }), env, context)
    await expectRegionalHomepage({ asset, locale, response, rewritten })
  }

  expect(transformAsset).toHaveBeenCalledTimes(I18N.SUPPORTED_LOCALES.length)
  expect(fetchHandler).not.toHaveBeenCalled()
})

it.each([undefined, "unquoted"])("does not invent a cache validator when the asset ETag is %j", async (etag) => {
  const headers = new Headers({ "Content-Type": "text/html" })
  if (etag !== undefined) {
    headers.set("ETag", etag)
  }
  const asset = new Response("<html><body>Homepage</body></html>", { headers })
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(asset)
  transformAsset.mockImplementationOnce((input) => new Response('<html data-ppp="70"><body>Homepage</body></html>', input))

  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { "If-None-Match": '"previous-70"', "cf-ipcountry": "PL" } }),
    env,
    context,
  )

  expect(response.headers.get("etag")).toBeNull()
  expect(await response.text()).toContain('data-ppp="70"')
})

it("falls back to rendering when a regional homepage has no prerendered asset", async () => {
  const assets = vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(new Response("missing", { status: 404 }))

  const response = await worker.fetch(new Request("http://localhost/", { headers: { "cf-ipcountry": "PL" } }), env, context)

  expect(await response.text()).toBe("rendered")
  expect(assets).toHaveBeenCalledOnce()
  expect(transformAsset).not.toHaveBeenCalled()
  expect(fetchHandler).toHaveBeenCalledOnce()
})

it("leaves full-price homepages and other discounted-country pages unchanged", async () => {
  const assets = vi.spyOn(env.ASSETS, "fetch")
  const pages = [
    { country: "US", pathname: "/" },
    { country: "US", pathname: "/pl-PL" },
    { country: "PL", pathname: "/pl-PL/docs" },
    { country: "PL", pathname: "/terms" },
  ]
  for (const { country, pathname } of pages) {
    const html = "<html><body>Unchanged page</body></html>"
    assets.mockResolvedValueOnce(new Response(html, { headers: { "Content-Type": "text/html" } }))
    const response = await worker.fetch(new Request(`http://localhost${pathname}`, { headers: { "cf-ipcountry": country } }), env, context)

    expect(await response.text()).toBe(html)
  }

  expect(rewriteHandlers).not.toHaveBeenCalled()
  expect(transformAsset).not.toHaveBeenCalled()
  expect(fetchHandler).not.toHaveBeenCalled()
})

it.each(['W/"homepage-70"', '"homepage-70"', '"other,tag", W/"homepage-70"', "*"])(
  "returns an empty 304 for a matching regional validator %j without rewriting",
  async (etag) => {
    const asset = new Response("current source", {
      headers: {
        "Content-Length": "14",
        "Content-Type": "text/html",
        ETag: '"homepage"',
        "Last-Modified": "Sun, 13 Sep 2026 12:00:00 GMT",
      },
    })
    const assets = vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(asset)
    const response = await worker.fetch(
      new Request("https://localhost/pl-PL", {
        headers: { "If-Modified-Since": "Sun, 13 Sep 2026 12:00:00 GMT", "If-None-Match": etag, "cf-ipcountry": "PL" },
      }),
      env,
      context,
    )

    expect(response.status).toBe(304)
    expect(response.headers.get("link")).toBeNull()
    expect(await response.text()).toBe("")
    expect(response.headers.get("etag")).toBe('W/"homepage-70"')
    expect(response.headers.get("content-length")).toBeNull()
    expect(response.headers.get("last-modified")).toBeNull()
    expect(response.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate")
    expect(response.headers.get("set-cookie")).toContain(`${I18N.COOKIE_NAME}=pl-PL`)
    const forwarded = assets.mock.lastCall?.[0]
    if (!(forwarded instanceof Request)) {
      throw new Error("Expected an asset Request")
    }
    expect(forwarded.headers.get("if-none-match")).toBeNull()
    expect(forwarded.headers.get("if-modified-since")).toBeNull()
    expect(asset.bodyUsed).toBe(true)
    expect(transformAsset).not.toHaveBeenCalled()
  },
)

it.each(['W/"old-70"', 'W/"homepage-80"', "invalid"])("sends current regional HTML for a different validator %j", async (etag) => {
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(
    new Response("current source", { headers: { "Content-Type": "text/html; charset=utf-8", ETag: 'W/"homepage"' } }),
  )
  transformAsset.mockImplementationOnce((input) => new Response("current regional page", input))

  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { "If-None-Match": etag, "cf-ipcountry": "PL" } }),
    env,
    context,
  )

  expect(response.status).toBe(200)
  expect(response.headers.get("etag")).toBe('W/"homepage-70"')
  expect(await response.text()).toBe("current regional page")
})

it("serves current regional HTML immediately when the deployed asset changes", async () => {
  const assets = vi.spyOn(env.ASSETS, "fetch")
  assets.mockResolvedValueOnce(new Response("old source", { headers: { "Content-Type": "text/html", ETag: '"old"' } }))
  transformAsset.mockImplementationOnce((input) => new Response("old regional page", input))
  const request = new Request("http://localhost/", { headers: { "cf-ipcountry": "PL" } })
  const first = await worker.fetch(request, env, context)
  expect(await first.text()).toBe("old regional page")
  expect(first.headers.get("etag")).toBe('W/"old-70"')
  assets.mockResolvedValueOnce(new Response("new source", { headers: { "Content-Type": "text/html", ETag: '"new"' } }))
  transformAsset.mockImplementationOnce((input) => new Response("new regional page", input))

  const second = await worker.fetch(
    new Request(request, { headers: { "If-None-Match": first.headers.get("etag") ?? "", "cf-ipcountry": "PL" } }),
    env,
    context,
  )

  expect(second.status).toBe(200)
  expect(await second.text()).toBe("new regional page")
  expect(second.headers.get("etag")).toBe('W/"new-70"')
  expect(assets).toHaveBeenCalledTimes(2)
  expect(transformAsset).toHaveBeenCalledTimes(2)
})

it.each(["current source", null])("returns the regional validator without a body for HEAD", async (body) => {
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(new Response(body, { headers: { "Content-Type": "text/html", ETag: '"homepage"' } }))

  const response = await worker.fetch(new Request("http://localhost/", { headers: { "cf-ipcountry": "PL" }, method: "HEAD" }), env, context)

  expect(response.status).toBe(200)
  expect(response.headers.get("etag")).toBe('W/"homepage-70"')
  expect(await response.text()).toBe("")
  expect(response.headers.get("link")).toContain(`<${DOCUMENT_STYLESHEET.href}>; rel=preload; as=style`)
  expect(transformAsset).not.toHaveBeenCalled()
})

it.each([
  { contentType: "text/html", status: 206 },
  { contentType: "text/html", status: 302 },
  { contentType: "text/html", status: 503 },
  { contentType: "application/json", status: 200 },
  { status: 200 },
])("preserves non-HTML or unsuccessful asset responses without rewriting them: %j", async ({ contentType, status }) => {
  const headers = new Headers()
  if (contentType !== undefined) {
    headers.set("Content-Type", contentType)
  }
  const asset = new Response("asset response", { headers, status })
  if (contentType === undefined) {
    asset.headers.delete("Content-Type")
  }
  vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(asset)

  const response = await worker.fetch(new Request("http://localhost/", { headers: { "cf-ipcountry": "PL" } }), env, context)

  expect(response).toBe(asset)
  expect(response.headers.get("link")).toBeNull()
  expect(transformAsset).not.toHaveBeenCalled()
})
