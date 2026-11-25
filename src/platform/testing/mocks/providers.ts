import { AUTH_PROVIDER_DOUBLES } from "~/src/platform/testing/mocks/auth.providers"
import { POLAR_PROVIDER_DOUBLES } from "~/src/platform/testing/mocks/polar"
import { RESEND_PROVIDER_DOUBLES } from "~/src/platform/testing/mocks/resend"

interface Refusal {
  readonly reason: string
  readonly response: Response
}

export interface ProviderDouble {
  readonly origin: string
  readonly reset: () => void
  readonly respond: (request: Request) => Promise<Refusal | Response>
}

const DOUBLES: readonly ProviderDouble[] = [...AUTH_PROVIDER_DOUBLES, ...POLAR_PROVIDER_DOUBLES, ...RESEND_PROVIDER_DOUBLES]

const PROVIDER_DOUBLES = new Map(DOUBLES.map(({ origin, respond }) => [origin, respond]))

const refusals: string[] = []

export const takeProviderRefusals = (): string[] => refusals.splice(0)

export const resetProviderDoubles = (): void => {
  for (const { reset } of DOUBLES) {
    reset()
  }
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
