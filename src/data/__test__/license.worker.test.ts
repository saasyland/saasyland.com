import { env } from "cloudflare:workers"

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { COUNTRY_HEADER, HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { PPP_ATTRIBUTE, PPP_COOKIE, PPP_DECLINED } from "~/src/modules/_core/constants/pricing"
import { bundleObjectKey, signBundle } from "~/src/modules/license/license.bundles"
import { BUNDLE_PATH_PREFIX } from "~/src/modules/license/license.constants"

import { LICENSE_WORKER_HANDLERS } from "~/src/data/license.worker"
import { WORKER_HANDLER_KIND } from "~/src/data/worker.constants"

import worker from "~/src/server"

const rewriteHandlers = vi.fn<(selector: string, handlers: HTMLRewriterElementContentHandlers) => void>()
const transformPage = vi.fn<(page: Response) => Response>()

class TestHTMLRewriter {
  on(selector: string, handlers: HTMLRewriterElementContentHandlers): this {
    rewriteHandlers(selector, handlers)
    return this
  }

  transform(page: Response): Response {
    return transformPage(page)
  }
}

const runElementHandler = async (selector: string, element: object): Promise<void> => {
  const handlers = new Map(rewriteHandlers.mock.calls).get(selector)
  if (!handlers?.element) {
    throw new Error(`Regional pricing did not register a ${selector} element handler`)
  }
  await Reflect.apply(handlers.element.bind(handlers), handlers, [element])
}

const [{ rewrite }] = LICENSE_WORKER_HANDLERS

const regionalPage = (): Response =>
  new Response("<html>Page</html>", {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Length": "17",
      "Content-Type": "text/html",
      ETag: '"page"',
      "Last-Modified": "Sun, 13 Sep 2026 12:00:00 GMT",
      Link: "</styles.css>; rel=preload; as=style",
      "Set-Cookie": "session=kept; HttpOnly",
    },
  })

const requestFrom = (country: string | undefined, cookie?: string): Request => {
  const headers = new Headers()
  if (country !== undefined) {
    headers.set(COUNTRY_HEADER, country)
  }
  if (cookie !== undefined) {
    headers.set("Cookie", cookie)
  }
  return new Request("https://localhost/", { headers })
}

beforeEach(() => {
  rewriteHandlers.mockReset()
  transformPage.mockReset()
  transformPage.mockImplementation((page) => page)
  vi.stubGlobal("HTMLRewriter", TestHTMLRewriter)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("regional pricing", () => {
  it.each([undefined, "US", "XX"])("leaves the page untouched for a full-price or unknown country: %j", (country) => {
    const page = regionalPage()

    expect(rewrite(page, { locale: I18N.DEFAULT_LOCALE, request: requestFrom(country) })).toBe(page)
    expect(page.headers.get("etag")).toBe('"page"')
    expect(rewriteHandlers).not.toHaveBeenCalled()
  })

  it.each<{ locale: SupportedLocale; style: string }>([
    { locale: "en-US", style: '--ppp-region:"Poland";--ppp-percent:"30%"' },
    { locale: "pl-PL", style: '--ppp-region:"Polska";--ppp-percent:"30%"' },
    { locale: "de-DE", style: '--ppp-region:"Polen";--ppp-percent:"30 %"' },
  ])("names the region and the discount in $locale", async ({ locale, style }) => {
    rewrite(regionalPage(), { locale, request: requestFrom("pl") })

    const setAttribute = vi.fn()
    await runElementHandler("html", { setAttribute })
    expect(setAttribute.mock.calls).toEqual([
      [PPP_ATTRIBUTE, "70"],
      ["style", style],
    ])
  })

  it("makes the page private and drops the validators of the shared copy, keeping its other headers", () => {
    const page = rewrite(regionalPage(), { locale: I18N.DEFAULT_LOCALE, request: requestFrom("PL") })

    expect(transformPage).toHaveBeenCalledOnce()
    expect(page.headers.get("cache-control")).toBe("private, no-cache")
    expect(page.headers.get("content-length")).toBeNull()
    expect(page.headers.get("etag")).toBeNull()
    expect(page.headers.get("last-modified")).toBeNull()
    expect(page.headers.get("link")).toBe("</styles.css>; rel=preload; as=style")
    expect(page.headers.get("set-cookie")).toBe("session=kept; HttpOnly")
  })

  it.each([
    { checked: true, cookie: undefined },
    { checked: false, cookie: `${PPP_COOKIE}=${PPP_DECLINED}` },
  ])("keeps the regional pricing checkbox checked: $checked, for the cookie $cookie", async ({ checked, cookie }) => {
    rewrite(regionalPage(), { locale: I18N.DEFAULT_LOCALE, request: requestFrom("PL", cookie) })

    const removeAttribute = vi.fn()
    await runElementHandler(".ppp-offer input", { removeAttribute })
    expect(removeAttribute.mock.calls).toEqual(checked ? [] : [["checked"]])
  })

  it("rewrites the pages the Worker serves", async () => {
    vi.spyOn(env.ASSETS, "fetch").mockResolvedValueOnce(regionalPage())
    transformPage.mockImplementationOnce(() => new Response("regional page"))

    const response = await worker.fetch(new Request("http://localhost/pl-PL/docs", { headers: { [COUNTRY_HEADER]: "PL" } }), env)

    expect(await response.text()).toBe("regional page")
    const setAttribute = vi.fn()
    await runElementHandler("html", { setAttribute })
    expect(setAttribute).toHaveBeenCalledWith("style", '--ppp-region:"Polska";--ppp-percent:"30%"')
  })
})

describe("template bundles", () => {
  it("claims every path under the bundle prefix", () => {
    const requestHandlers = LICENSE_WORKER_HANDLERS.filter((handler) => handler.kind === WORKER_HANDLER_KIND.REQUEST)

    expect(requestHandlers.map(({ pathPrefix }) => pathPrefix)).toStrictEqual([`${BUNDLE_PATH_PREFIX}/`])
  })

  it("streams a signed bundle without the locale middleware or TanStack Start", async () => {
    const version = "0.1.0"
    await env.BUNDLES.put(bundleObjectKey(version), "archive")
    const { url } = await signBundle({ host: "localhost", now: Date.now(), secret: env.AUTH_SECRET, version })

    const response = await worker.fetch(new Request(url, { headers: { cookie: `${I18N.COOKIE_NAME}=pl-PL` } }), env)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(await response.text()).toBe("archive")
    expect(response.headers.get("set-cookie")).toBeNull()
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  })
})
