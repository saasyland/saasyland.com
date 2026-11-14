import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { resolveLocale } from "~/src/integrations/use-intl/i18n.middleware"
import { extractLocaleFromPath, shouldIgnorePath } from "~/src/integrations/use-intl/i18n.paths"

import { HTTPS_SECURITY_HEADERS, HTTP_STATUS, SECURITY_HEADERS } from "~/src/modules/_core/constants/api"

import { DOCUMENT_HANDLERS, REQUEST_HANDLERS } from "~/src/data/worker"

import { serializeCookie } from "~/src/lib/cookie"

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

const withSecurityHeaders = (response: Response, protocol: string): Response => {
  const secured = new Response(response.body, response)
  const headers = protocol === "https:" ? { ...SECURITY_HEADERS, ...HTTPS_SECURITY_HEADERS } : SECURITY_HEADERS

  for (const [name, value] of Object.entries(headers)) {
    secured.headers.set(name, value)
  }

  return secured
}

const respond = async (request: Request, env: Cloudflare.Env): Promise<Response> => {
  const { redirect, setCookie } = resolveLocale(request)

  if (redirect) {
    return redirect
  }

  const response = await render(request, env)
  const { pathname, protocol } = new URL(request.url)

  const isHtml = response.status === HTTP_STATUS.OK && !shouldIgnorePath(pathname) && HTML.test(response.headers.get("Content-Type") ?? "")
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

  return DOCUMENT_HANDLERS.reduce((document, { rewrite }) => rewrite(document, { locale, request }), page)
}

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const { pathname, protocol } = new URL(request.url)
    const handler = REQUEST_HANDLERS.find(({ pathPrefix }) => pathname.startsWith(pathPrefix))
    const response = handler === undefined ? await respond(request, env) : await handler.fetch(request)
    return withSecurityHeaders(response, protocol)
  },
} satisfies ExportedHandler<Cloudflare.Env>
