import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { resolveLocale } from "~/src/integrations/use-intl/i18n.middleware"
import { extractLocaleFromPath, shouldIgnorePath } from "~/src/integrations/use-intl/i18n.paths"

import { HTTPS_SECURITY_HEADERS, HTTP_STATUS, SECURITY_HEADERS } from "~/src/modules/_core/constants/api"

import { DOCUMENT_HANDLERS, REQUEST_HANDLERS } from "~/src/data/worker"

import { createNonce, renderedPagePolicy } from "~/src/lib/content-security-policy"
import { serializeCookie } from "~/src/lib/cookie"

import { DOCUMENT_STYLESHEET, fontPreloads } from "~/src/presentation/document-assets"

const HTML = /^text\/html(?:\s*;|$)/iu

const CONTENT_SECURITY_POLICY_HEADER = "Content-Security-Policy"

const BASE_POLICY = SECURITY_HEADERS[CONTENT_SECURITY_POLICY_HEADER]

interface Rendered {
  readonly policy: string
  readonly response: Response
}

const render = async (request: Request, env: Cloudflare.Env): Promise<Rendered> => {
  if ((request.method === "GET" || request.method === "HEAD") && !shouldIgnorePath(new URL(request.url).pathname)) {
    const asset = await env.ASSETS.fetch(request)
    if (asset.status !== HTTP_STATUS.NOT_FOUND) {
      return { policy: BASE_POLICY, response: asset }
    }
  }
  const { default: handler } = await import("@tanstack/react-start/server-entry")
  const nonce = createNonce()
  const response = await handler.fetch(request, { context: { nonce } })

  if (import.meta.env.DEV) {
    return { policy: BASE_POLICY, response }
  }

  return { policy: renderedPagePolicy(nonce), response }
}

const withSecurityHeaders = (response: Response, { policy, protocol }: { policy: string; protocol: string }): Response => {
  const secured = new Response(response.body, response)
  const headers = protocol === "https:" ? { ...SECURITY_HEADERS, ...HTTPS_SECURITY_HEADERS } : SECURITY_HEADERS

  for (const [name, value] of Object.entries({ ...headers, [CONTENT_SECURITY_POLICY_HEADER]: policy })) {
    secured.headers.set(name, value)
  }

  return secured
}

const respond = async (request: Request, env: Cloudflare.Env): Promise<Rendered> => {
  const { redirect, setCookie } = resolveLocale(request)

  if (redirect) {
    return { policy: BASE_POLICY, response: redirect }
  }

  const { policy, response } = await render(request, env)
  const { pathname, protocol } = new URL(request.url)

  const isHtml = response.status === HTTP_STATUS.OK && !shouldIgnorePath(pathname) && HTML.test(response.headers.get("Content-Type") ?? "")
  if (!setCookie && !isHtml) {
    return { policy, response }
  }

  const page = new Response(response.body, response)
  if (setCookie) {
    const cookie = serializeCookie({ name: I18N.COOKIE_NAME, options: { secure: protocol === "https:" }, value: setCookie.value })
    page.headers.append("Set-Cookie", cookie)
  }

  if (!isHtml) {
    return { policy, response: page }
  }

  const locale = extractLocaleFromPath(pathname) ?? I18N.DEFAULT_LOCALE

  const fonts = fontPreloads(locale).map(
    (font) => `<${font.href}>; rel=preload; as=font; type="${font.type}"; crossorigin=${font.crossOrigin}`,
  )

  page.headers.append("Link", [`<${DOCUMENT_STYLESHEET.href}>; rel=preload; as=style`, ...fonts].join(", "))

  return { policy, response: DOCUMENT_HANDLERS.reduce((document, { rewrite }) => rewrite(document, { locale, request }), page) }
}

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const { pathname, protocol } = new URL(request.url)
    const handler = REQUEST_HANDLERS.find(({ pathPrefix }) => pathname.startsWith(pathPrefix))
    if (handler !== undefined) {
      return withSecurityHeaders(await handler.fetch(request), { policy: BASE_POLICY, protocol })
    }

    const { policy, response } = await respond(request, env)
    return withSecurityHeaders(response, { policy, protocol })
  },
} satisfies ExportedHandler<Cloudflare.Env>
