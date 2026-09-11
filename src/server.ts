import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { handleLocaleMiddleware } from "~/src/integrations/use-intl/i18n.middleware"
import { extractLocaleFromPath, shouldIgnorePath } from "~/src/integrations/use-intl/i18n.paths"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import { PPP_ATTRIBUTE, PPP_PERCENT, pppMultiplierKey } from "~/src/modules/_core/constants/pricing"

import { serializeCookie } from "~/src/lib/cookie"

import { DOCUMENT_STYLESHEET, fontPreloads } from "~/src/presentation/document-assets"

export interface RequestContext {
  env: Cloudflare.Env
  waitUntil: (promise: Promise<unknown>) => void
  passThroughOnException: () => void
}

const HTTP_STATUS = { NOT_FOUND: 404, NOT_MODIFIED: 304, OK: 200 } as const
const BROWSER_CACHE_CONTROL = "public, max-age=0, must-revalidate"
const ETAG_PATTERN = /^(?:W\/)?"(?<value>[^"]*)"$/u
const CONDITIONAL_ETAG_PATTERN = /(?:W\/)?"[^"]*"|\*/gu
const HTML_CONTENT_TYPE_PATTERN = /^text\/html(?:\s*;|$)/iu

const PPP_PAGES: ReadonlySet<string> = new Set(
  I18N.SUPPORTED_LOCALES.map((locale) => (locale === I18N.DEFAULT_LOCALE ? "/" : `/${locale}`)),
)

const withParityBand = (asset: Response, multiplierKey: number): Response =>
  new HTMLRewriter()
    .on("html", {
      element: (element) => {
        element.setAttribute(PPP_ATTRIBUTE, String(multiplierKey))
      },
    })
    .transform(asset)

const regionalHeaders = (source: Headers, multiplierKey: number): Headers => {
  const headers = new Headers(source)
  const assetTag = ETAG_PATTERN.exec(headers.get("ETag") ?? "")?.groups?.["value"]
  headers.set("Cache-Control", BROWSER_CACHE_CONTROL)
  headers.delete("Content-Length")
  headers.delete("Last-Modified")
  headers.delete("ETag")
  if (assetTag !== undefined) {
    headers.set("ETag", `W/"${assetTag}-${multiplierKey}"`)
  }
  return headers
}

const regionalLandingPage = async (request: Request, env: Cloudflare.Env, multiplierKey: number): Promise<Response> => {
  const assetHeaders = new Headers(request.headers)
  assetHeaders.delete("If-None-Match")
  assetHeaders.delete("If-Modified-Since")
  const asset = await env.ASSETS.fetch(new Request(request.url, { headers: assetHeaders }))
  if (asset.status !== HTTP_STATUS.OK || !HTML_CONTENT_TYPE_PATTERN.test(asset.headers.get("Content-Type") ?? "")) {
    return asset
  }

  const headers = regionalHeaders(asset.headers, multiplierKey)
  const etag = headers.get("ETag")
  const notModified =
    request.headers
      .get("If-None-Match")
      ?.match(CONDITIONAL_ETAG_PATTERN)
      ?.some((tag) => tag === "*" || tag.replace(/^W\//u, "") === etag?.replace(/^W\//u, "")) ?? false
  if (notModified || request.method === "HEAD") {
    await asset.body?.cancel()
    return new Response(undefined, { headers, status: notModified ? HTTP_STATUS.NOT_MODIFIED : HTTP_STATUS.OK })
  }

  return withParityBand(new Response(asset.body, { headers }), multiplierKey)
}

const render = async (
  request: Request,
  env: Cloudflare.Env,
  ctx: Pick<ExecutionContext, "waitUntil" | "passThroughOnException">,
): Promise<Response> => {
  const url = new URL(request.url)

  if ((request.method === "GET" || request.method === "HEAD") && !shouldIgnorePath(url.pathname)) {
    const multiplierKey = PPP_PAGES.has(url.pathname) ? pppMultiplierKey(request.headers.get(COUNTRY_HEADER) ?? undefined) : PPP_PERCENT
    const asset = await (multiplierKey === PPP_PERCENT ? env.ASSETS.fetch(request) : regionalLandingPage(request, env, multiplierKey))
    if (asset.status !== HTTP_STATUS.NOT_FOUND) {
      return asset
    }
  }
  const { default: handler } = await import("@tanstack/react-start/server-entry")
  return handler.fetch(request, {
    context: { env, passThroughOnException: ctx.passThroughOnException.bind(ctx), waitUntil: ctx.waitUntil.bind(ctx) },
  })
}

const server = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: Pick<ExecutionContext, "waitUntil" | "passThroughOnException">) {
    const { redirect, setCookie } = handleLocaleMiddleware(request)
    if (redirect) {
      return redirect
    }
    const response = await render(request, env, ctx)
    const url = new URL(request.url)
    const isHtml =
      response.status === HTTP_STATUS.OK &&
      !shouldIgnorePath(url.pathname) &&
      HTML_CONTENT_TYPE_PATTERN.test(response.headers.get("Content-Type") ?? "")
    if (!setCookie && !isHtml) {
      return response
    }
    const mutable = new Response(response.body, response)
    if (isHtml) {
      const fonts = fontPreloads(extractLocaleFromPath(url.pathname) ?? I18N.DEFAULT_LOCALE)
      const preloads = [
        `<${DOCUMENT_STYLESHEET.href}>; rel=preload; as=style`,
        ...fonts.map(
          ({ as, crossOrigin, href, rel, type }) => `<${href}>; rel=${rel}; as=${as}; type="${type}"; crossorigin=${crossOrigin}`,
        ),
      ]
      mutable.headers.append("Link", preloads.join(", "))
    }
    if (setCookie) {
      mutable.headers.append(
        "Set-Cookie",
        serializeCookie({ name: I18N.COOKIE_NAME, options: { secure: url.protocol === "https:" }, value: setCookie.value }),
      )
    }
    return mutable
  },
} satisfies ExportedHandler<Cloudflare.Env>

export default server
