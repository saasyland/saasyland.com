import { polarCheckoutOrigin } from "~/src/integrations/polar/polar.constants"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { resolveLocale } from "~/src/integrations/use-intl/i18n.middleware"
import { extractLocaleFromPath, shouldIgnorePath } from "~/src/integrations/use-intl/i18n.paths"

import { HTTPS_SECURITY_HEADERS, HTTP_STATUS, SECURITY_HEADERS } from "~/src/modules/_core/constants/api"
import { BUSINESS_LOGO_PATH_PREFIX } from "~/src/modules/business-profile/business-profile.logo"
import { COURSE_COVER_PATH_PREFIX } from "~/src/modules/course/course.cover"
import { LESSON_ATTACHMENT_PATH_PREFIX } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { BUNDLE_PATH_PREFIX } from "~/src/modules/license/license.constants"
import { rewritePppOffer } from "~/src/modules/license/license.pricing"
import { markSession } from "~/src/modules/session/session.rewrite"

import { createNonce, documentPolicy, withNonce } from "~/src/lib/content-security-policy"
import { serializeCookie } from "~/src/lib/cookie"
import { MEDIA_PATH_PREFIX } from "~/src/lib/media-response"

import { fontPreloads } from "~/src/presentation/document-assets"
import * as ROUTES from "~/src/routes"

const HTML = /^text\/html(?:\s*;|$)/iu

const CONTENT_SECURITY_POLICY_HEADER = "Content-Security-Policy"

const BASE_POLICY = SECURITY_HEADERS[CONTENT_SECURITY_POLICY_HEADER]

interface Rendered {
  readonly policy: string
  readonly response: Response
}

interface RequestHandler {
  readonly fetch: (request: Request) => Promise<Response>
  readonly pathPrefix: string
}

type DocumentRewrite = (document: Response, context: { locale: SupportedLocale; request: Request }) => Response

const REQUEST_HANDLERS: readonly RequestHandler[] = [
  {
    fetch: async (request) => {
      const { serveBusinessLogo } = await import("~/src/modules/business-profile/business-profile.delivery")

      return serveBusinessLogo(request)
    },
    pathPrefix: `${BUSINESS_LOGO_PATH_PREFIX}/`,
  },
  {
    fetch: async (request) => {
      const { serveCover } = await import("~/src/modules/course/course.delivery")

      return serveCover(request)
    },
    pathPrefix: `${COURSE_COVER_PATH_PREFIX}/`,
  },
  {
    fetch: async (request) => {
      const { serveCourseSitemap } = await import("~/src/modules/course/course.delivery")

      return serveCourseSitemap(request)
    },
    pathPrefix: ROUTES.COURSES_SITEMAP,
  },
  {
    fetch: async (request) => {
      const { serveAttachment } = await import("~/src/modules/lesson-attachment/lesson-attachment.delivery")

      return serveAttachment(request)
    },
    pathPrefix: `${LESSON_ATTACHMENT_PATH_PREFIX}/`,
  },
  {
    fetch: async (request) => {
      const { serveMedia } = await import("~/src/modules/video/video.delivery")

      return serveMedia(request)
    },
    pathPrefix: `${MEDIA_PATH_PREFIX}/`,
  },
  {
    fetch: async (request) => {
      const { serveBundle } = await import("~/src/modules/license/license.delivery")

      return serveBundle(request)
    },
    pathPrefix: `${BUNDLE_PATH_PREFIX}/`,
  },
]

const DOCUMENT_REWRITES: readonly DocumentRewrite[] = [rewritePppOffer, markSession]

const DOCUMENT_CACHE_CONTROL = "private, no-cache"

const STALE_DOCUMENT_HEADERS = ["Content-Length", "ETag", "Last-Modified"]

const isDocument = (response: Response): boolean =>
  response.status === HTTP_STATUS.OK && HTML.test(response.headers.get("Content-Type") ?? "")

const render = async (request: Request, env: Cloudflare.Env): Promise<Rendered> => {
  if ((request.method === "GET" || request.method === "HEAD") && !shouldIgnorePath(new URL(request.url).pathname)) {
    const asset = await env.ASSETS.fetch(request)
    if (isDocument(asset)) {
      const nonce = createNonce()
      return { policy: documentPolicy(nonce, [polarCheckoutOrigin(env.POLAR_SERVER)]), response: withNonce(asset, nonce) }
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

  return { policy: documentPolicy(nonce, [polarCheckoutOrigin(env.POLAR_SERVER)]), response }
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
  headers.append("Vary", "Cookie")
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

  return { policy, response: DOCUMENT_REWRITES.reduce((document, rewrite) => rewrite(document, { locale, request }), page) }
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
