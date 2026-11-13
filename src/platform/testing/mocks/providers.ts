import * as zod from "zod"

import { POLAR_CHECKOUT_ID_PLACEHOLDER } from "~/src/integrations/polar/polar.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

const customers = new Map<string, Record<string, unknown>>()
const nativeFetch = globalThis.fetch
const recipientsSchema = zod.array(zod.string())
const resendEmailSchema = zod.object({
  from: zod.string(),
  html: zod.string(),
  subject: zod.string(),
  to: zod.union([zod.string(), recipientsSchema]),
})

const polarCheckoutSchema = zod.object({ success_url: zod.string() })

const RESEND_EMAILS_URL = "https://api.resend.com/emails"
const POLAR_CHECKOUTS_PATH = "/v1/checkouts/"

const RESEND_IDEMPOTENCY_KEY_MAX_LENGTH = 256

interface CapturedEmail extends Omit<zod.infer<typeof resendEmailSchema>, "to"> {
  readonly id: string
  readonly idempotencyKey: string | null
  readonly to: string[]
}

const sentEmails: CapturedEmail[] = []

export const getSentEmails = (recipient: string): CapturedEmail[] => sentEmails.filter(({ to }) => to.includes(recipient))

export const clearSentEmails = (): void => {
  sentEmails.length = 0
}

const resendError = (statusCode: number, name: string, message: string): Response =>
  Response.json({ message, name, statusCode }, { status: statusCode })

export const respondAsResend = async (request: Request): Promise<Response> => {
  if (request.method !== "POST" || request.url !== RESEND_EMAILS_URL) {
    return resendError(HTTP_STATUS.NOT_FOUND, "not_found", `The Resend fake does not serve ${request.method} ${request.url}`)
  }
  const idempotencyKey = request.headers.get("Idempotency-Key")
  if (idempotencyKey !== null && (idempotencyKey.length === 0 || idempotencyKey.length > RESEND_IDEMPOTENCY_KEY_MAX_LENGTH)) {
    return resendError(HTTP_STATUS.BAD_REQUEST, "invalid_idempotency_key", "Key must be between 1 and 256 characters.")
  }
  const payload = resendEmailSchema.parse(await request.json())
  const id = crypto.randomUUID()
  sentEmails.push({ ...payload, id, idempotencyKey, to: typeof payload.to === "string" ? [payload.to] : payload.to })
  return Response.json({ id })
}

const respondAsPolarCheckout = async (request: Request): Promise<Response> => {
  const { success_url: successUrl } = polarCheckoutSchema.parse(await request.json())
  const id = crypto.randomUUID()
  return Response.json({ client_secret: `polar_c_${id}`, id, url: successUrl.replace(POLAR_CHECKOUT_ID_PLACEHOLDER, id) })
}

const respondAsPolarCustomer = async (request: Request, url: URL): Promise<Response> => {
  const id = url.pathname.split("/").findLast(Boolean)
  if (request.method === "GET") {
    const customer = id === undefined ? undefined : customers.get(id)
    if (customer !== undefined) {
      return Response.json(customer)
    }
    const email = url.searchParams.get("email")
    const items = [...customers.values()].filter((entry) => email === null || entry["email"] === email)
    return Response.json({ items, pagination: { max_page: 1, total_count: items.length } })
  }
  const body: unknown = await request.json()
  const fields = typeof body === "object" && body !== null ? body : {}
  const customerId = id !== undefined && customers.has(id) ? id : crypto.randomUUID()
  const customer = {
    avatar_url: null,
    billing_address: null,
    billing_name: null,
    created_at: new Date().toISOString(),
    deleted_at: null,
    email: "test@example.test",
    email_verified: false,
    id: customerId,
    metadata: {},
    modified_at: null,
    name: "Test User",
    organization_id: "00000000-0000-4000-8000-000000000003",
    tax_id: null,
    type: "individual",
    ...customers.get(customerId),
    ...fields,
  }
  customers.set(customerId, customer)
  return Response.json(customer)
}

export const installProviderMocks = (): void => {
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const request = new Request(input, init)
      const url = new URL(request.url)
      if (url.hostname === "api.resend.com") {
        return respondAsResend(request)
      }
      if (url.hostname === "sandbox-api.polar.sh" && url.pathname === POLAR_CHECKOUTS_PATH && request.method === "POST") {
        return respondAsPolarCheckout(request)
      }
      if (url.hostname === "sandbox-api.polar.sh" && url.pathname.startsWith("/v1/customers")) {
        return respondAsPolarCustomer(request, url)
      }
      return nativeFetch(request)
    },
    { preconnect: nativeFetch.preconnect },
  )
}
