import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { LIVE_SITE_CHECK_RETRY_DELAYS_MS, LIVE_SITE_CHECK_TIMEOUT_MS, verifyDeployment } from "~/src/lib/deployment"

const PRODUCTION_ORIGIN = "https://saasyland.com"

const PREVIEW_ORIGIN = "https://preview.saasyland.com"

const HTML = "text/html; charset=utf-8"

const PLAIN_TEXT = "text/plain; charset=utf-8"

const JSON_BODY = "application/json"

const CHECKED_PATHS = ["/", "/courses", "/robots.txt", "/api", "/api/auth/get-session"]

const ATTEMPTS = LIVE_SITE_CHECK_RETRY_DELAYS_MS.length + 1

const EVERY_RETRY_MS = LIVE_SITE_CHECK_RETRY_DELAYS_MS.reduce((total, delay) => total + delay, 0)

type Answer = () => Promise<Response>

const page =
  (status: number, contentType: string): Answer =>
  () =>
    Promise.resolve(new Response("body", { headers: { "content-type": contentType }, status }))

const untyped =
  (status: number): Answer =>
  () =>
    Promise.resolve(new Response(null, { status }))

const WORKING_SITE: Readonly<Record<string, Answer>> = {
  "/": page(200, HTML),
  "/api": page(200, JSON_BODY),
  "/api/auth/get-session": page(200, JSON_BODY),
  "/courses": page(200, HTML),
  "/robots.txt": page(200, PLAIN_TEXT),
}

const fetchMock = vi.fn<(input: URL, init: RequestInit) => Promise<Response>>()

const serve = (overrides: Readonly<Record<string, Answer>> = {}): void => {
  const answers = { ...WORKING_SITE, ...overrides }
  fetchMock.mockImplementation((url) => {
    const answer = answers[url.pathname]
    if (answer === undefined) {
      return Promise.reject(new Error(`unexpected request to ${url.href}`))
    }

    return answer()
  })
}

const requestsFor = (path: string): number => fetchMock.mock.calls.filter(([url]) => url.pathname === path).length

const productionRefusal = (...problems: readonly string[]): Error =>
  new Error([`The production Worker at ${PRODUCTION_ORIGIN} is deployed but does not answer as expected:`, ...problems].join("\n"))

const expectProductionRefusal = async (expected: Error | string): Promise<void> => {
  const failure = expect(verifyDeployment("production")).rejects.toThrow(expected)
  await vi.advanceTimersByTimeAsync(EVERY_RETRY_MS)

  await failure
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("verifyDeployment on a working site", () => {
  it.each([
    ["production", PRODUCTION_ORIGIN],
    ["preview", PREVIEW_ORIGIN],
  ] as const)("asks the %s Worker on its custom domain for every checked path", async (environment, origin) => {
    serve()

    await expect(verifyDeployment(environment)).resolves.toBe(
      `The ${environment} Worker at ${origin} answered ${CHECKED_PATHS.join(", ")} as expected.`,
    )
    expect(fetchMock.mock.calls.map(([url]) => url.href).toSorted()).toStrictEqual(
      CHECKED_PATHS.map((path) => `${origin}${path}`).toSorted(),
    )
  })

  it("asks once per path, without following a redirect, and stops waiting on a path that hangs", async () => {
    serve()
    const timeout = vi.spyOn(AbortSignal, "timeout")

    await verifyDeployment("production")

    expect(fetchMock).toHaveBeenCalledTimes(CHECKED_PATHS.length)
    expect(fetchMock.mock.calls.every(([, init]) => init.redirect === "manual" && init.signal instanceof AbortSignal)).toBe(true)
    expect(timeout).toHaveBeenCalledWith(LIVE_SITE_CHECK_TIMEOUT_MS)
  })
})

describe("verifyDeployment on a site that answers wrongly", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("refuses a course catalogue that cannot render, as when its D1 tables are missing", async () => {
    serve({ "/courses": page(500, HTML) })

    await expectProductionRefusal(productionRefusal(`GET ${PRODUCTION_ORIGIN}/courses answered 500 ${HTML} instead of 200 text/html.`))
  })

  it("refuses a home page that redirects, naming the status alone when there is no content type", async () => {
    serve({ "/": untyped(302) })

    const failure = expect(verifyDeployment("preview")).rejects.toThrow(
      new Error(
        [
          `The preview Worker at ${PREVIEW_ORIGIN} is deployed but does not answer as expected:`,
          `GET ${PREVIEW_ORIGIN}/ answered 302 instead of 200 text/html.`,
        ].join("\n"),
      ),
    )
    await vi.advanceTimersByTimeAsync(EVERY_RETRY_MS)

    await failure
  })

  it("refuses a page that answers 200 with no content type", async () => {
    serve({ "/courses": untyped(200) })

    await expectProductionRefusal(`GET ${PRODUCTION_ORIGIN}/courses answered 200 instead of 200 text/html.`)
  })

  it("refuses a session endpoint that fails, as when the Worker is missing a secret", async () => {
    serve({ "/api/auth/get-session": page(500, JSON_BODY) })

    await expectProductionRefusal(
      productionRefusal(`GET ${PRODUCTION_ORIGIN}/api/auth/get-session answered 500 ${JSON_BODY} instead of 200 application/json.`),
    )
  })

  it("refuses a robots.txt rendered by the Worker instead of served as a static file", async () => {
    serve({ "/robots.txt": page(404, HTML) })

    await expectProductionRefusal(`GET ${PRODUCTION_ORIGIN}/robots.txt answered 404 ${HTML} instead of 200 text/plain.`)
  })

  it("reports a path that does not answer at all", async () => {
    serve({ "/api": () => Promise.reject(new TypeError("fetch failed")) })

    await expectProductionRefusal(`GET ${PRODUCTION_ORIGIN}/api did not answer: TypeError: fetch failed`)
  })

  it("lists every path that failed, in the order it checks them, and only those", async () => {
    serve({ "/": page(500, HTML), "/api": page(404, HTML) })

    await expectProductionRefusal(
      productionRefusal(
        `GET ${PRODUCTION_ORIGIN}/ answered 500 ${HTML} instead of 200 text/html.`,
        `GET ${PRODUCTION_ORIGIN}/api answered 404 ${HTML} instead of 200 application/json.`,
      ),
    )
  })

  it(`asks a failing path ${String(ATTEMPTS)} times before giving up, and every other path once`, async () => {
    serve({ "/courses": page(500, HTML) })

    await expectProductionRefusal("/courses answered 500")

    expect(requestsFor("/courses")).toBe(ATTEMPTS)
    expect(CHECKED_PATHS.filter((path) => path !== "/courses").map((path) => requestsFor(path))).toStrictEqual([1, 1, 1, 1])
  })

  it("waits before asking again, so a version still spreading across Cloudflare can take over", async () => {
    const catalogue = vi.fn<Answer>().mockImplementationOnce(page(500, HTML)).mockImplementation(page(200, HTML))
    serve({ "/courses": catalogue })

    const [firstRetryDelay = 0] = LIVE_SITE_CHECK_RETRY_DELAYS_MS
    const verifying = verifyDeployment("production")
    await vi.advanceTimersByTimeAsync(firstRetryDelay - 1)

    expect(catalogue).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(1)

    await expect(verifying).resolves.toContain("as expected")
    expect(catalogue).toHaveBeenCalledTimes(2)
  })
})
