import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import {
  PPP_ATTRIBUTE,
  PPP_COOKIE,
  PPP_DECLINED,
  PPP_KEYS,
  PPP_PERCENTS_OFF,
  getPppMultiplier,
  getPppPercentOff,
  pppMultiplierKey,
  regionalPrice,
  rewritePppOffer,
} from "~/src/modules/license/license.pricing"

import { CURRENCY_FORMAT } from "~/src/data/pricing"

const formatPrice = (amount: number): string => new Intl.NumberFormat("en-US", CURRENCY_FORMAT).format(amount)

describe("regional pricing", () => {
  it.each([
    { country: "PT", multiplier: 0.8, percentOff: 20, price: "$239.20" },
    { country: "pl", multiplier: 0.7, percentOff: 30, price: "$209.30" },
    { country: "IN", multiplier: 0.6, percentOff: 40, price: "$179.40" },
    { country: "UA", multiplier: 0.5, percentOff: 50, price: "$149.50" },
  ])("charges exactly the discount percentage on the $299 price for $country", ({ country, multiplier, percentOff, price }) => {
    expect(getPppMultiplier(country)).toBe(multiplier)
    expect(getPppPercentOff(country)).toBe(percentOff)
    expect(pppMultiplierKey(country)).toBe(100 - percentOff)
    expect(formatPrice(299 * multiplier)).toBe(price)
  })

  it.each([undefined, "US", "XX"])("preserves the original price for a full-price or unavailable country: %j", (country) => {
    const multiplier = getPppMultiplier(country)

    expect(multiplier).toBe(1)
    expect(getPppPercentOff(country)).toBe(0)
    expect(pppMultiplierKey(country)).toBe(100)
    expect(formatPrice(295 * multiplier)).toBe("$295")
  })

  it("lists the percentage off of each regional band", () => {
    expect(PPP_PERCENTS_OFF).toStrictEqual([20, 30, 40, 50])
  })

  it("rounds a regional price down to whole dollars and keeps the full price whole", () => {
    expect(PPP_KEYS.map((key) => regionalPrice(249, key))).toStrictEqual([249, 199, 174, 149, 124])
    expect(PPP_KEYS.map((key) => regionalPrice(399, key))).toStrictEqual([399, 319, 279, 239, 199])
  })
})

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

const regionalPage = (): Response =>
  new Response("<html>Page</html>", {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/html",
      ETag: '"page"',
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

describe("the regional price offer on a page", () => {
  beforeEach(() => {
    rewriteHandlers.mockReset()
    transformPage.mockReset()
    transformPage.mockImplementation((page) => page)
    vi.stubGlobal("HTMLRewriter", TestHTMLRewriter)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([undefined, "US", "XX"])("leaves the page untouched for a full-price or unknown country: %j", (country) => {
    const page = regionalPage()

    expect(rewritePppOffer(page, { locale: I18N.DEFAULT_LOCALE, request: requestFrom(country) })).toBe(page)
    expect(rewriteHandlers).not.toHaveBeenCalled()
  })

  it.each<{ locale: SupportedLocale; style: string }>([
    { locale: "en-US", style: '--ppp-region:"Poland";--ppp-percent:"30%"' },
    { locale: "pl-PL", style: '--ppp-region:"Polska";--ppp-percent:"30%"' },
    { locale: "de-DE", style: '--ppp-region:"Polen";--ppp-percent:"30\u00A0%"' },
  ])("names the region and the discount in $locale", async ({ locale, style }) => {
    rewritePppOffer(regionalPage(), { locale, request: requestFrom("pl") })

    const setAttribute = vi.fn()
    await runElementHandler("html", { setAttribute })
    expect(setAttribute.mock.calls).toStrictEqual([
      [PPP_ATTRIBUTE, "70"],
      ["style", style],
    ])
  })

  it("rewrites the page and leaves its headers to the Worker, which keeps every document private", () => {
    const page = rewritePppOffer(regionalPage(), { locale: I18N.DEFAULT_LOCALE, request: requestFrom("PL") })

    expect(transformPage).toHaveBeenCalledOnce()
    expect(page.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate")
    expect(page.headers.get("link")).toBe("</styles.css>; rel=preload; as=style")
    expect(page.headers.get("set-cookie")).toBe("session=kept; HttpOnly")
  })

  it.each([
    { checked: true, cookie: undefined },
    { checked: false, cookie: `${PPP_COOKIE}=${PPP_DECLINED}` },
  ])("keeps the regional pricing checkbox checked: $checked, for the cookie $cookie", async ({ checked, cookie }) => {
    rewritePppOffer(regionalPage(), { locale: I18N.DEFAULT_LOCALE, request: requestFrom("PL", cookie) })

    const removeAttribute = vi.fn()
    await runElementHandler(".ppp-offer input", { removeAttribute })
    expect(removeAttribute.mock.calls).toStrictEqual(checked ? [] : [["checked"]])
  })
})
