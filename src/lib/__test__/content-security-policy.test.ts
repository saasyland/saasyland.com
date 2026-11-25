import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { POLAR_SERVER } from "~/src/integrations/polar/polar.constants"

import { SECURITY_HEADERS } from "~/src/modules/_core/constants/api"

import { createNonce, documentPolicy, withNonce } from "~/src/lib/content-security-policy"

const SAMPLE_SIZE = 50
const NONCE = "0123456789abcdef0123456789abcdef"

const rewriteHandlers = vi.fn<(selector: string, handlers: HTMLRewriterElementContentHandlers) => void>()

class TestHTMLRewriter {
  on(selector: string, handlers: HTMLRewriterElementContentHandlers): this {
    rewriteHandlers(selector, handlers)
    return this
  }

  transform(page: Response): Response {
    return new Response(`rewritten ${page.status}`)
  }
}

const runElementHandler = async (selector: string): Promise<unknown[][]> => {
  const handlers = new Map(rewriteHandlers.mock.calls).get(selector)
  if (!handlers?.element) {
    throw new Error(`The nonce rewriter registered no ${selector} element handler`)
  }
  const setAttribute = vi.fn()
  await Reflect.apply(handlers.element.bind(handlers), handlers, [{ setAttribute }])
  return setAttribute.mock.calls
}

beforeEach(() => {
  rewriteHandlers.mockReset()
  vi.stubGlobal("HTMLRewriter", TestHTMLRewriter)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe("documentPolicy", () => {
  it("allows the scripts that carry the nonce and the scripts they load, and keeps every directive of the base policy", () => {
    const policy = documentPolicy(NONCE, POLAR_SERVER.PRODUCTION)

    expect(policy).toBe(
      `script-src 'nonce-${NONCE}' 'strict-dynamic' 'unsafe-inline' https:; frame-src https://polar.sh; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`,
    )
    expect(policy.split("; ")).toEqual(expect.arrayContaining(SECURITY_HEADERS["Content-Security-Policy"].split("; ")))
  })

  it.each([
    { origin: "https://polar.sh", server: POLAR_SERVER.PRODUCTION },
    { origin: "https://sandbox.polar.sh", server: POLAR_SERVER.SANDBOX },
  ])("frames only the $server checkout of Polar, at $origin", ({ origin, server }) => {
    const frameSources = documentPolicy(NONCE, server)
      .split("; ")
      .filter((directive) => directive.startsWith("frame-src "))

    expect(frameSources).toStrictEqual([`frame-src ${origin}`])
  })
})

describe("createNonce", () => {
  it("returns 128 random bits as 32 hex characters", () => {
    expect(createNonce()).toMatch(/^[\da-f]{32}$/u)
  })

  it("returns a different nonce on every call", () => {
    expect(new Set(Array.from({ length: SAMPLE_SIZE }, createNonce)).size).toBe(SAMPLE_SIZE)
  })
})

describe("withNonce", () => {
  it("streams the page through the rewriter", async () => {
    const page = withNonce(new Response("<html></html>"), NONCE)

    expect(await page.text()).toBe("rewritten 200")
    expect(rewriteHandlers.mock.calls.map(([selector]) => selector)).toStrictEqual([
      'script:not([type="application/ld+json"])',
      'link[rel="modulepreload"]',
      "[nonce]",
      'meta[property="csp-nonce"]',
    ])
  })

  it.each(['script:not([type="application/ld+json"])', 'link[rel="modulepreload"]', "[nonce]"])(
    "gives %s the nonce of this response, replacing the one prerendering baked in",
    async (selector) => {
      withNonce(new Response("<html></html>"), NONCE)

      expect(await runElementHandler(selector)).toStrictEqual([["nonce", NONCE]])
    },
  )

  it("tells the router the nonce of this response, so the scripts it adds in the browser match the header", async () => {
    withNonce(new Response("<html></html>"), NONCE)

    expect(await runElementHandler('meta[property="csp-nonce"]')).toStrictEqual([["content", NONCE]])
  })
})
