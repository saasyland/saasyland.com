import { readCookie } from "~/src/lib/cookie"

import { APP_SLUG } from "~/src/presentation/branding"

const SESSION_TOKEN_COOKIE = `${APP_SLUG}.session_token`

export const SESSION_COOKIE_NAMES = [SESSION_TOKEN_COOKIE, `__Secure-${SESSION_TOKEN_COOKIE}`] as const

export const SESSION_ATTRIBUTE = "data-session"

export const carriesSessionCookie = (request: Request): boolean =>
  SESSION_COOKIE_NAMES.some((name) => Boolean(readCookie({ header: request.headers.get("Cookie"), name })))

export const markSession = (page: Response, { request }: { request: Request }): Response => {
  if (!carriesSessionCookie(request)) {
    return page
  }

  return new HTMLRewriter()
    .on("html", {
      element: (html) => {
        html.setAttribute(SESSION_ATTRIBUTE, "")
      },
    })
    .transform(page)
}
