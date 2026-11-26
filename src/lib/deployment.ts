import { DEPLOYED_HOSTS, HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { OAUTH_PROVIDERS, SOCIAL_SIGN_IN_PATH } from "~/src/data/auth"

import { signInPost } from "~/src/lib/auth"
import { ORGANIZATION_LOGO, PAGES_SITEMAP_PATH, SITEMAP_PATH, SOCIAL_IMAGE } from "~/src/lib/seo"

import { ROUTES } from "~/src/routes"

export const CONTENT_TYPE = {
  HTML: "text/html",
  JSON: "application/json",
  PLAIN_TEXT: "text/plain",
  XML: "application/xml",
} as const

export interface LiveSitePost {
  readonly body: Readonly<Record<string, string>>
  readonly findProblems: (answer: unknown, origin: string) => readonly string[]
  readonly name: string
}

export interface LiveSiteCheck {
  readonly contentType: string
  readonly path: string
  readonly post?: LiveSitePost
}

const ROBOTS_TXT = "/robots.txt"

export const LIVE_SITE_CHECK_RETRY_DELAY_MS = 5000

export const LIVE_SITE_CHECK_RETRY_DELAYS_MS = [LIVE_SITE_CHECK_RETRY_DELAY_MS, LIVE_SITE_CHECK_RETRY_DELAY_MS]

export const LIVE_SITE_CHECK_TIMEOUT_MS = 15_000

export const LIVE_SITE_CHECKS: readonly LiveSiteCheck[] = [
  { contentType: CONTENT_TYPE.HTML, path: ROUTES.HOME },
  { contentType: CONTENT_TYPE.PLAIN_TEXT, path: ROBOTS_TXT },
  { contentType: CONTENT_TYPE.PLAIN_TEXT, path: ROUTES.WELL_KNOWN.SECURITY_TXT },
  { contentType: CONTENT_TYPE.XML, path: SITEMAP_PATH },
  { contentType: CONTENT_TYPE.XML, path: PAGES_SITEMAP_PATH },
  { contentType: SOCIAL_IMAGE.TYPE, path: SOCIAL_IMAGE.SITE_PATH },
  { contentType: SOCIAL_IMAGE.TYPE, path: ORGANIZATION_LOGO.PATH },
  { contentType: CONTENT_TYPE.JSON, path: ROUTES.API.INDEX },
  { contentType: CONTENT_TYPE.JSON, path: `${ROUTES.API.AUTH.BASE}${ROUTES.API.AUTH.GET_SESSION}` },
  ...OAUTH_PROVIDERS.map((provider) => ({ contentType: CONTENT_TYPE.JSON, path: SOCIAL_SIGN_IN_PATH, post: signInPost(provider) })),
  { contentType: CONTENT_TYPE.XML, path: ROUTES.BLOG.FEED },
  { contentType: CONTENT_TYPE.HTML, path: ROUTES.COURSES },
  { contentType: CONTENT_TYPE.XML, path: ROUTES.SITEMAPS.COURSES },
]

const METHOD = { GET: "GET", POST: "POST" } as const

type DeployedEnvironment = keyof typeof DEPLOYED_HOSTS

const wait = async (milliseconds: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, milliseconds)
  await promise
}

const describeCheck = ({ path, post }: LiveSiteCheck): string => (post === undefined ? path : `${path} (${post.name})`)

const describeRequest = (url: URL, check: LiveSiteCheck): string =>
  `${check.post === undefined ? METHOD.GET : METHOD.POST} ${url.origin}${describeCheck(check)}`

const requestInit = (url: URL, { post }: LiveSiteCheck): RequestInit => {
  const init: RequestInit = { redirect: "manual", signal: AbortSignal.timeout(LIVE_SITE_CHECK_TIMEOUT_MS) }
  if (post === undefined) {
    return init
  }

  return {
    ...init,
    body: JSON.stringify(post.body),
    headers: { "content-type": CONTENT_TYPE.JSON, origin: url.origin },
    method: METHOD.POST,
  }
}

const describeMismatch = (request: string, response: Response, { contentType }: LiveSiteCheck): string => {
  const answer = [String(response.status), response.headers.get("content-type")].filter((part) => part !== null).join(" ")

  return `${request} answered ${answer} instead of ${String(HTTP_STATUS.OK)} ${contentType}.`
}

const findAnswerProblems = async (url: URL, response: Response, { post }: LiveSiteCheck): Promise<readonly string[]> =>
  post === undefined ? [] : post.findProblems(await response.json(), url.origin)

const findProblems = async (url: URL, check: LiveSiteCheck): Promise<string[]> => {
  const request = describeRequest(url, check)

  try {
    const response = await fetch(url, requestInit(url, check))
    const contentType = response.headers.get("content-type")
    if (response.status !== HTTP_STATUS.OK || contentType?.startsWith(check.contentType) !== true) {
      return [describeMismatch(request, response, check)]
    }

    const problems = await findAnswerProblems(url, response, check)

    return problems.length === 0 ? [] : [`${request}: ${problems.join(", ")}.`]
  } catch (error) {
    return [`${request} did not answer: ${String(error)}`]
  }
}

const checkUntilAnswered = async (
  url: URL,
  check: LiveSiteCheck,
  [delay, ...laterDelays] = LIVE_SITE_CHECK_RETRY_DELAYS_MS,
): Promise<string[]> => {
  const problems = await findProblems(url, check)
  if (problems.length === 0 || delay === undefined) {
    return problems
  }

  await wait(delay)

  return checkUntilAnswered(url, check, laterDelays)
}

export const verifyDeployment = async (
  environment: DeployedEnvironment,
  checks: readonly LiveSiteCheck[] = LIVE_SITE_CHECKS,
): Promise<string> => {
  const origin = `https://${DEPLOYED_HOSTS[environment]}`
  const problems = await Promise.all(checks.map((check) => checkUntilAnswered(new URL(check.path, origin), check)))
  const failures = problems.flat()

  if (failures.length > 0) {
    throw new Error([`The ${environment} Worker at ${origin} is deployed but does not answer as expected:`, ...failures].join("\n"))
  }

  return `The ${environment} Worker at ${origin} answered ${checks.map((check) => describeCheck(check)).join(", ")} as expected.`
}
