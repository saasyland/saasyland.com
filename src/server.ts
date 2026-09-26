import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { resolveLocale } from "~/src/integrations/use-intl/i18n.middleware"
import { extractLocaleFromPath, shouldIgnorePath } from "~/src/integrations/use-intl/i18n.paths"

import { COUNTRY_HEADER, HTTP_STATUS } from "~/src/modules/_core/constants/api"
import {
  PPP_ATTRIBUTE,
  PPP_COOKIE,
  PPP_DECLINED,
  PPP_PERCENT,
  getPppPercentOff,
  pppMultiplierKey,
} from "~/src/modules/_core/constants/pricing"

import { readCookie, serializeCookie } from "~/src/lib/cookie"

import { DOCUMENT_STYLESHEET, fontPreloads } from "~/src/presentation/document-assets"

const HTML = /^text\/html(?:\s*;|$)/iu

const render = async (request: Request, env: Cloudflare.Env): Promise<Response> => {
  if ((request.method === "GET" || request.method === "HEAD") && !shouldIgnorePath(new URL(request.url).pathname)) {
    const asset = await env.ASSETS.fetch(request)
    if (asset.status !== HTTP_STATUS.NOT_FOUND) {
      return asset
    }
  }
  const { default: handler } = await import("@tanstack/react-start/server-entry")
  return handler.fetch(request)
}

const withRegionalPricing = (page: Response, request: Request, locale: string): Response => {
  const country = request.headers.get(COUNTRY_HEADER)?.toUpperCase()
  const multiplierKey = pppMultiplierKey(country)

  if (country === undefined || multiplierKey === PPP_PERCENT) {
    return page
  }

  const region = new Intl.DisplayNames([locale], { type: "region" }).of(country)
  const percent = new Intl.NumberFormat(locale, { style: "percent" }).format(getPppPercentOff(country) / PPP_PERCENT)
  const declined = readCookie({ header: request.headers.get("Cookie"), name: PPP_COOKIE }) === PPP_DECLINED

  page.headers.set("Cache-Control", "private, no-cache")
  page.headers.delete("Content-Length")
  page.headers.delete("ETag")
  page.headers.delete("Last-Modified")

  return new HTMLRewriter()
    .on("html", {
      element: (html) => {
        html.setAttribute(PPP_ATTRIBUTE, String(multiplierKey))
        html.setAttribute("style", `--ppp-region:${JSON.stringify(region)};--ppp-percent:${JSON.stringify(percent)}`)
      },
    })
    .on(".ppp-offer input", {
      element: (input) => {
        if (declined) {
          input.removeAttribute("checked")
        }
      },
    })
    .transform(page)
}

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const { redirect, setCookie } = resolveLocale(request)

    if (redirect) {
      return redirect
    }

    const response = await render(request, env)
    const { pathname, protocol } = new URL(request.url)

    const isHtml =
      response.status === HTTP_STATUS.OK && !shouldIgnorePath(pathname) && HTML.test(response.headers.get("Content-Type") ?? "")
    if (!setCookie && !isHtml) {
      return response
    }

    const page = new Response(response.body, response)
    if (setCookie) {
      const cookie = serializeCookie({ name: I18N.COOKIE_NAME, options: { secure: protocol === "https:" }, value: setCookie.value })
      page.headers.append("Set-Cookie", cookie)
    }

    if (!isHtml) {
      return page
    }

    const locale = extractLocaleFromPath(pathname) ?? I18N.DEFAULT_LOCALE

    const fonts = fontPreloads(locale).map(
      (font) => `<${font.href}>; rel=preload; as=font; type="${font.type}"; crossorigin=${font.crossOrigin}`,
    )

    page.headers.append("Link", [`<${DOCUMENT_STYLESHEET.href}>; rel=preload; as=style`, ...fonts].join(", "))

    return withRegionalPricing(page, request, locale)
  },
} satisfies ExportedHandler<Cloudflare.Env>
