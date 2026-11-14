import { env } from "cloudflare:workers"

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import { PPP_ATTRIBUTE, PPP_COOKIE, PPP_DECLINED } from "~/src/modules/_core/constants/pricing"

import { LICENSE_WORKER_HANDLERS } from "~/src/data/license.worker"

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
