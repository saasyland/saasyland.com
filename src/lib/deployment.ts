import { DEPLOYED_HOSTS, HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { SITEMAP_PATH, SOCIAL_IMAGE } from "~/src/lib/seo"

import { ROUTES } from "~/src/routes"

const RETRY_DELAY_MS = 5000

export const LIVE_SITE_CHECK_RETRY_DELAYS_MS = [RETRY_DELAY_MS, RETRY_DELAY_MS]

export const LIVE_SITE_CHECK_TIMEOUT_MS = 15_000

interface LiveSiteCheck {
  readonly contentType: string
  readonly path: string
  readonly status: number
}

type DeployedEnvironment = keyof typeof DEPLOYED_HOSTS

const CONTENT_TYPE = {
  HTML: "text/html",
  JSON: "application/json",
  PLAIN_TEXT: "text/plain",
  XML: "application/xml",
} as const

const ROBOTS_TXT = "/robots.txt"

export const LIVE_SITE_CHECKS: readonly LiveSiteCheck[] = [
  { contentType: CONTENT_TYPE.HTML, path: ROUTES.HOME, status: HTTP_STATUS.OK },
  { contentType: CONTENT_TYPE.HTML, path: ROUTES.COURSES, status: HTTP_STATUS.OK },
  { contentType: CONTENT_TYPE.PLAIN_TEXT, path: ROBOTS_TXT, status: HTTP_STATUS.OK },
  { contentType: CONTENT_TYPE.XML, path: SITEMAP_PATH, status: HTTP_STATUS.OK },
  { contentType: SOCIAL_IMAGE.TYPE, path: SOCIAL_IMAGE.SITE_PATH, status: HTTP_STATUS.OK },
  { contentType: CONTENT_TYPE.JSON, path: ROUTES.API, status: HTTP_STATUS.OK },
  { contentType: CONTENT_TYPE.JSON, path: `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.GET_SESSION}`, status: HTTP_STATUS.OK },
]

const wait = async (milliseconds: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, milliseconds)
  await promise
}

const describeMismatch = (url: URL, response: Response, { contentType, status }: LiveSiteCheck): string => {
  const answer = [String(response.status), response.headers.get("content-type")].filter((part) => part !== null).join(" ")

  return `GET ${url.href} answered ${answer} instead of ${String(status)} ${contentType}.`
}

const findProblem = async (url: URL, check: LiveSiteCheck): Promise<string | undefined> => {
  try {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(LIVE_SITE_CHECK_TIMEOUT_MS) })
    const contentType = response.headers.get("content-type")
    const answersAsExpected = response.status === check.status && contentType?.startsWith(check.contentType) === true

    return answersAsExpected ? undefined : describeMismatch(url, response, check)
  } catch (error) {
    return `GET ${url.href} did not answer: ${String(error)}`
  }
}

const checkUntilAnswered = async (
  url: URL,
  check: LiveSiteCheck,
  [delay, ...laterDelays] = LIVE_SITE_CHECK_RETRY_DELAYS_MS,
): Promise<string | undefined> => {
  const problem = await findProblem(url, check)
  if (problem === undefined || delay === undefined) {
    return problem
  }

  await wait(delay)

  return checkUntilAnswered(url, check, laterDelays)
}

export const verifyDeployment = async (environment: DeployedEnvironment): Promise<string> => {
  const origin = `https://${DEPLOYED_HOSTS[environment]}`
  const problems = await Promise.all(LIVE_SITE_CHECKS.map((check) => checkUntilAnswered(new URL(check.path, origin), check)))
  const failures = problems.filter((problem) => problem !== undefined)

  if (failures.length > 0) {
    throw new Error([`The ${environment} Worker at ${origin} is deployed but does not answer as expected:`, ...failures].join("\n"))
  }

  return `The ${environment} Worker at ${origin} answered ${LIVE_SITE_CHECKS.map(({ path }) => path).join(", ")} as expected.`
}
