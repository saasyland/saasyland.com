import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { resolveLocale } from "~/src/integrations/use-intl/i18n.middleware"
import { extractLocaleFromPath, shouldIgnorePath } from "~/src/integrations/use-intl/i18n.paths"

import { HTTPS_SECURITY_HEADERS, HTTP_STATUS, SECURITY_HEADERS } from "~/src/modules/_core/constants/api"

import { DOCUMENT_HANDLERS, REQUEST_HANDLERS } from "~/src/data/worker"

import { createNonce, documentPolicy, withNonce } from "~/src/lib/content-security-policy"
import { serializeCookie } from "~/src/lib/cookie"

import { fontPreloads } from "~/src/presentation/document-assets"

const HTML = /^text\/html(?:\s*;|$)/iu

const CONTENT_SECURITY_POLICY_HEADER = "Content-Security-Policy"

const BASE_POLICY = SECURITY_HEADERS[CONTENT_SECURITY_POLICY_HEADER]

interface Rendered {
  readonly policy: string
  readonly response: Response
}

const DOCUMENT_CACHE_CONTROL = "private, no-cache"

const STALE_DOCUMENT_HEADERS = ["Content-Length", "ETag", "Last-Modified"]

const isDocument = (response: Response): boolean =>
  response.status === HTTP_STATUS.OK && HTML.test(response.headers.get("Content-Type") ?? "")

const render = async (request: Request, env: Cloudflare.Env): Promise<Rendered> => {
  if ((request.method === "GET" || request.method === "HEAD") && !shouldIgnorePath(new URL(request.url).pathname)) {
    const asset = await env.ASSETS.fetch(request)
    if (isDocument(asset)) {
      const nonce = createNonce()
      return { policy: documentPolicy(nonce), response: withNonce(asset, nonce) }
    }
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

  return { policy: documentPolicy(nonce), response }
}

const withSecurityHeaders = (response: Response, { policy, protocol }: { policy: string; protocol: string }): Response => {
  const secured = new Response(response.body, response)
  const headers = protocol === "https:" ? { ...SECURITY_HEADERS, ...HTTPS_SECURITY_HEADERS } : SECURITY_HEADERS

  for (const [name, value] of Object.entries({ ...headers, [CONTENT_SECURITY_POLICY_HEADER]: policy })) {
    secured.headers.set(name, value)
  }

  return secured
}

const setDocumentHeaders = (headers: Headers, locale: SupportedLocale): void => {
  const fonts = fontPreloads(locale).map(
    (font) => `<${font.href}>; rel=preload; as=font; type="${font.type}"; crossorigin=${font.crossOrigin}`,
  )

  headers.append("Link", fonts.join(", "))
  headers.set("Cache-Control", DOCUMENT_CACHE_CONTROL)
  for (const name of STALE_DOCUMENT_HEADERS) {
    headers.delete(name)
  }
}

const respond = async (request: Request, env: Cloudflare.Env): Promise<Rendered> => {
  const { redirect, setCookie } = resolveLocale(request)

  if (redirect) {
    return { policy: BASE_POLICY, response: redirect }
  }

  const { policy, response } = await render(request, env)
  const { pathname, protocol } = new URL(request.url)

  const isHtml = !shouldIgnorePath(pathname) && isDocument(response)
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
  setDocumentHeaders(page.headers, locale)

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
