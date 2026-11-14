import { polarApi, resetPolar } from "~/src/platform/testing/mocks/polar"
import { resendApi, resetResend } from "~/src/platform/testing/mocks/resend"

interface Refusal {
  readonly reason: string
  readonly response: Response
}

type ProviderDouble = (request: Request) => Promise<Refusal | Response>

const PROVIDER_DOUBLES = new Map<string, ProviderDouble>([
  [polarApi.origin, polarApi.respond],
  [resendApi.origin, resendApi.respond],
])

const refusals: string[] = []

export const takeProviderRefusals = (): string[] => refusals.splice(0)

export const resetProviderDoubles = (): void => {
  resetPolar()
  resetResend()
  refusals.length = 0
}

export const servesProvider = (request: Request): boolean => PROVIDER_DOUBLES.has(new URL(request.url).origin)

export const fetchFromProviders = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> => {
  const request = new Request(input, init)
  const provider = PROVIDER_DOUBLES.get(new URL(request.url).origin)
  if (provider === undefined) {
    throw new TypeError(`fetch failed: tests run offline and do not reach ${request.url}`)
  }
  const outcome = await provider(request)
  if (outcome instanceof Response) {
    return outcome
  }
  refusals.push(`${request.method} ${request.url}: ${outcome.reason}`)
  return outcome.response
}
