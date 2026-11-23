import { DEPLOYED_HOSTS } from "~/src/modules/_core/constants/api"

import { LIVE_SITE_CHECKS } from "~/src/data/live"
import { CONTENT_TYPE, type LiveSiteCheck } from "~/src/data/live.constants"

export const LIVE_SITE_CHECK_RETRY_DELAY_MS = 5000

export const LIVE_SITE_CHECK_RETRY_DELAYS_MS = [LIVE_SITE_CHECK_RETRY_DELAY_MS, LIVE_SITE_CHECK_RETRY_DELAY_MS]

export const LIVE_SITE_CHECK_TIMEOUT_MS = 15_000

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

const describeMismatch = (request: string, response: Response, { contentType, status }: LiveSiteCheck): string => {
  const answer = [String(response.status), response.headers.get("content-type")].filter((part) => part !== null).join(" ")

  return `${request} answered ${answer} instead of ${String(status)} ${contentType}.`
}

const findAnswerProblems = async (url: URL, response: Response, { post }: LiveSiteCheck): Promise<readonly string[]> =>
  post === undefined ? [] : post.findProblems(await response.json(), url.origin)

const findProblems = async (url: URL, check: LiveSiteCheck): Promise<string[]> => {
  const request = describeRequest(url, check)

  try {
    const response = await fetch(url, requestInit(url, check))
    const contentType = response.headers.get("content-type")
    if (response.status !== check.status || contentType?.startsWith(check.contentType) !== true) {
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

export const verifyDeployment = async (environment: DeployedEnvironment): Promise<string> => {
  const origin = `https://${DEPLOYED_HOSTS[environment]}`
  const problems = await Promise.all(LIVE_SITE_CHECKS.map((check) => checkUntilAnswered(new URL(check.path, origin), check)))
  const failures = problems.flat()

  if (failures.length > 0) {
    throw new Error([`The ${environment} Worker at ${origin} is deployed but does not answer as expected:`, ...failures].join("\n"))
  }

  return `The ${environment} Worker at ${origin} answered ${LIVE_SITE_CHECKS.map((check) => describeCheck(check)).join(", ")} as expected.`
}
