import { getCookies, getSessionCookie } from "better-auth/cookies"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { LAST_LOGIN_METHOD_COOKIE, LOGIN_METHOD } from "~/src/integrations/better-auth/auth.constants"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { SESSION_ATTRIBUTE, SESSION_COOKIE_NAMES, carriesSessionCookie, markSession } from "~/src/modules/session/session.rewrite"

import { APP_SLUG } from "~/src/presentation/branding"

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

const requestWith = (cookie?: string): Request =>
  new Request("https://localhost/", cookie === undefined ? {} : { headers: { Cookie: cookie } })

const [plainName, secureName] = SESSION_COOKIE_NAMES

const COOKIE_HEADERS = [
  undefined,
  "",
  `${LAST_LOGIN_METHOD_COOKIE}=${LOGIN_METHOD.EMAIL}`,
  `${plainName}=token.signature`,
  `${secureName}=token.signature`,
  `theme=dark; ${secureName}=token%2Bsigned; ${LAST_LOGIN_METHOD_COOKIE}=${LOGIN_METHOD.GITHUB}`,
  `${plainName}=`,
  `${APP_SLUG}.session_data=cached`,
  "better-auth.session_token=token.signature",
]

describe("the session cookie", () => {
  it.each([false, true])("is named as Better Auth names it from the site's own configuration, secure cookies %s", (useSecureCookies) => {
    const { sessionToken } = getCookies({ ...auth.options, advanced: { ...auth.options.advanced, useSecureCookies } })

    expect(SESSION_COOKIE_NAMES).toContain(sessionToken.name)
  })

  it.each(COOKIE_HEADERS)("is found exactly when Better Auth's own check finds it, in the Cookie header %j", (cookie) => {
    const request = requestWith(cookie)

    expect(carriesSessionCookie(request)).toBe(getSessionCookie(request, { cookiePrefix: APP_SLUG }) !== null)
  })
})

describe("the session mark on a page", () => {
  beforeEach(() => {
    rewriteHandlers.mockReset()
    transformPage.mockReset()
    transformPage.mockImplementation(() => new Response("marked page"))
    vi.stubGlobal("HTMLRewriter", TestHTMLRewriter)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("leaves the page of a request without a session cookie untouched", () => {
    const page = new Response("<html>Page</html>")

    expect(markSession(page, { request: requestWith(`${LAST_LOGIN_METHOD_COOKIE}=${LOGIN_METHOD.EMAIL}`) })).toBe(page)
    expect(rewriteHandlers).not.toHaveBeenCalled()
  })

  it("marks the document of a request that carries the session cookie, without asking anyone whether the session is valid", async () => {
    const page = new Response("<html>Page</html>")
    const setAttribute = vi.fn()

    const marked = markSession(page, { request: requestWith(`${secureName}=token.signature`) })
    const handlers = new Map(rewriteHandlers.mock.calls).get("html")
    if (!handlers?.element) {
      throw new Error("The session mark registered no html element handler")
    }
    await Reflect.apply(handlers.element.bind(handlers), handlers, [{ setAttribute }])

    expect(await marked.text()).toBe("marked page")
    expect(transformPage).toHaveBeenCalledExactlyOnceWith(page)
    expect(rewriteHandlers).toHaveBeenCalledOnce()
    expect(setAttribute).toHaveBeenCalledExactlyOnceWith(SESSION_ATTRIBUTE, "")
  })

  it("is the attribute the stylesheet's signed-in variant matches", () => {
    expect(readFileSync("src/presentation/styles/globals.css", "utf8")).toContain(
      `@custom-variant signed-in (&:where([${SESSION_ATTRIBUTE}] *));`,
    )
  })
})
