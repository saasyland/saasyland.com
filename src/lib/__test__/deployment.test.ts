import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { DEPLOYED_HOSTS, ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { LIVE_SITE_CHECKS } from "~/src/data/live"
import type { LiveSiteCheck } from "~/src/data/live.constants"

import { LIVE_SITE_CHECK_RETRY_DELAYS_MS, LIVE_SITE_CHECK_TIMEOUT_MS, verifyDeployment } from "~/src/lib/deployment"

import { ROUTES } from "~/src/routes"

const LOOKUP = await vi.hoisted(async () => {
  const [{ CONTENT_TYPE }, { HTTP_STATUS }, zod] = await Promise.all([
    import("~/src/data/live.constants"),
    import("~/src/modules/_core/constants/api"),
    import("zod"),
  ])
  const answerSchema = zod.object({ problems: zod.array(zod.string()) })

  return {
    contentType: CONTENT_TYPE.JSON,
    path: "/api/lookup",
    post: {
      body: { term: "deployment" },
      findProblems: (answer: unknown, origin: string) => answerSchema.parse(answer).problems.map((problem) => `${problem} on ${origin}`),
      name: "lookup",
    },
    status: HTTP_STATUS.OK,
  } satisfies LiveSiteCheck
})

vi.mock(import("~/src/data/live"), async () => {
  const { CORE_LIVE_CHECKS } = await import("~/src/data/core.live")

  return { LIVE_SITE_CHECKS: [...CORE_LIVE_CHECKS, LOOKUP] }
})

const PRODUCTION_ORIGIN = `https://${DEPLOYED_HOSTS[ENVIRONMENT.PRODUCTION]}`

const PREVIEW_ORIGIN = `https://${DEPLOYED_HOSTS[ENVIRONMENT.PREVIEW]}`

const HTML = "text/html; charset=utf-8"

const JSON_BODY = "application/json"

const XML = "application/xml"

const CHECKED_PATHS = LIVE_SITE_CHECKS.map(({ path }) => path)

const DESCRIBED_CHECKS = CHECKED_PATHS.map((path) => (path === LOOKUP.path ? `${path} (${LOOKUP.post.name})` : path))

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

const lookupAnswer =
  (status: number, problems: readonly string[]): Answer =>
  () =>
    Promise.resolve(Response.json({ problems }, { status }))

const WORKING_SITE: Readonly<Record<string, Answer>> = {
  ...Object.fromEntries(LIVE_SITE_CHECKS.map(({ contentType, path, status }) => [path, page(status, `${contentType}; charset=utf-8`)])),
  [LOOKUP.path]: lookupAnswer(LOOKUP.status, []),
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
  const failure = expect(verifyDeployment(ENVIRONMENT.PRODUCTION)).rejects.toThrow(expected)
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
    [ENVIRONMENT.PRODUCTION, PRODUCTION_ORIGIN],
    [ENVIRONMENT.PREVIEW, PREVIEW_ORIGIN],
  ] as const)("asks the %s Worker on its custom domain for every checked path", async (environment, origin) => {
    serve()

    await expect(verifyDeployment(environment)).resolves.toBe(
      `The ${environment} Worker at ${origin} answered ${DESCRIBED_CHECKS.join(", ")} as expected.`,
    )
    expect(fetchMock.mock.calls.map(([url]) => url.href).toSorted()).toStrictEqual(
      CHECKED_PATHS.map((path) => `${origin}${path}`).toSorted(),
    )
  })

  it("asks once per path, without following a redirect, and stops waiting on a path that hangs", async () => {
    serve()
    const timeout = vi.spyOn(AbortSignal, "timeout")

    await verifyDeployment(ENVIRONMENT.PRODUCTION)

    expect(fetchMock).toHaveBeenCalledTimes(CHECKED_PATHS.length)
    expect(fetchMock.mock.calls.every(([, init]) => init.redirect === "manual" && init.signal instanceof AbortSignal)).toBe(true)
    expect(timeout).toHaveBeenCalledWith(LIVE_SITE_CHECK_TIMEOUT_MS)
  })

  it("posts a check's JSON body from the site's own origin and fetches every other path without a body", async () => {
    serve()

    await verifyDeployment(ENVIRONMENT.PREVIEW)

    const posts = fetchMock.mock.calls.filter(([url]) => url.pathname === LOOKUP.path).map(([, init]) => init)
    expect(posts).toStrictEqual([
      expect.objectContaining({
        body: JSON.stringify(LOOKUP.post.body),
        headers: { "content-type": JSON_BODY, origin: PREVIEW_ORIGIN },
        method: "POST",
      }),
    ])
    expect(fetchMock.mock.calls.filter(([url]) => url.pathname !== LOOKUP.path).map(([, init]) => [init.method, init.body])).toStrictEqual(
      CHECKED_PATHS.slice(1).map(() => [undefined, undefined]),
    )
  })
})

describe("verifyDeployment on a site that answers wrongly", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("refuses a home page that cannot render", async () => {
    serve({ "/": page(500, HTML) })

    await expectProductionRefusal(productionRefusal(`GET ${PRODUCTION_ORIGIN}/ answered 500 ${HTML} instead of 200 text/html.`))
  })

  it("refuses a home page that redirects, naming the status alone when there is no content type", async () => {
    serve({ "/": untyped(302) })

    const failure = expect(verifyDeployment(ENVIRONMENT.PREVIEW)).rejects.toThrow(
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
    serve({ "/": untyped(200) })

    await expectProductionRefusal(`GET ${PRODUCTION_ORIGIN}/ answered 200 instead of 200 text/html.`)
  })

  it("refuses an API endpoint that fails, as when the Worker is missing a secret", async () => {
    serve({ [ROUTES.API]: page(500, JSON_BODY) })

    await expectProductionRefusal(
      productionRefusal(`GET ${PRODUCTION_ORIGIN}${ROUTES.API} answered 500 ${JSON_BODY} instead of 200 application/json.`),
    )
  })

  it("refuses a robots.txt rendered by the Worker instead of served as a static file", async () => {
    serve({ "/robots.txt": page(404, HTML) })

    await expectProductionRefusal(`GET ${PRODUCTION_ORIGIN}/robots.txt answered 404 ${HTML} instead of 200 text/plain.`)
  })

  it("refuses a sitemap the build did not write, which the Worker answers with its HTML 404 page", async () => {
    serve({ "/sitemap.xml": page(404, HTML) })

    await expectProductionRefusal(`GET ${PRODUCTION_ORIGIN}/sitemap.xml answered 404 ${HTML} instead of 200 ${XML}.`)
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
    serve({ "/sitemap.xml": page(500, HTML) })

    await expectProductionRefusal("/sitemap.xml answered 500")

    expect(requestsFor("/sitemap.xml")).toBe(ATTEMPTS)
    expect(CHECKED_PATHS.filter((path) => path !== "/sitemap.xml").map((path) => requestsFor(path))).toStrictEqual(
      CHECKED_PATHS.slice(1).map(() => 1),
    )
  })

  it("waits before asking again, so a version still spreading across Cloudflare can take over", async () => {
    const home = vi.fn<Answer>().mockImplementationOnce(page(500, HTML)).mockImplementation(page(200, HTML))
    serve({ "/": home })

    const [firstRetryDelay = 0] = LIVE_SITE_CHECK_RETRY_DELAYS_MS
    const verifying = verifyDeployment(ENVIRONMENT.PRODUCTION)
    await vi.advanceTimersByTimeAsync(firstRetryDelay - 1)

    expect(home).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(1)

    await expect(verifying).resolves.toContain("as expected")
    expect(home).toHaveBeenCalledTimes(2)
  })

  it("names the posted request and the check when its endpoint fails", async () => {
    serve({ [LOOKUP.path]: lookupAnswer(500, []) })

    await expectProductionRefusal(
      productionRefusal(`POST ${PRODUCTION_ORIGIN}${LOOKUP.path} (lookup) answered 500 ${JSON_BODY} instead of 200 ${JSON_BODY}.`),
    )
  })

  it("reports every problem the check finds in the answer, which it judges against the site's own origin", async () => {
    serve({ [LOOKUP.path]: lookupAnswer(200, ["no match", "stale index"]) })

    await expectProductionRefusal(
      productionRefusal(
        `POST ${PRODUCTION_ORIGIN}${LOOKUP.path} (lookup): no match on ${PRODUCTION_ORIGIN}, stale index on ${PRODUCTION_ORIGIN}.`,
      ),
    )
    expect(requestsFor(LOOKUP.path)).toBe(ATTEMPTS)
  })
})
