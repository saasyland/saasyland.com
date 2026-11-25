import { env } from "cloudflare:workers"

import type { CreateEmailResponseSuccess, EmailApiOptions, ErrorResponse } from "resend"
import * as zod from "zod"

import type { ProviderDouble } from "~/src/platform/testing/mocks/providers"

import { resendClient } from "~/src/integrations/resend/resend.config"
import { RESEND_BATCH_LIMIT } from "~/src/integrations/resend/resend.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

const MAX_RECIPIENTS = 50
const IDEMPOTENCY_KEY_MAX_LENGTH = 256
const SENDER = /^(?:[^<>]+ <(?<named>[^<>]+)>|(?<bare>[^<>\s]+))$/u

const address = zod.email()

const sender = zod.string().refine((value) => {
  const groups = SENDER.exec(value)?.groups
  return address.safeParse(groups?.["named"] ?? groups?.["bare"]).success
}, "from must be an email address or `Name <email address>`")

const sendEmailSchema = zod.strictObject({
  from: sender,
  headers: zod.record(zod.string(), zod.string()).default({}),
  html: zod.string().min(1),
  subject: zod.string().min(1),
  to: zod.union([address, zod.array(address).min(1).max(MAX_RECIPIENTS)]),
} satisfies { readonly [Key in keyof EmailApiOptions]?: zod.ZodType<EmailApiOptions[Key]> })

const sendBatchSchema = zod.array(sendEmailSchema).min(1).max(RESEND_BATCH_LIMIT)

const EMAILS_PATH = "/emails"

const BATCH_PATH = "/emails/batch"

export interface SentEmail {
  readonly from: string
  readonly headers: Readonly<Record<string, string>>
  readonly html: string
  readonly id: string
  readonly idempotencyKey: string | null
  readonly subject: string
  readonly to: readonly string[]
}

const sentEmails: SentEmail[] = []
const idempotentRequests = new Map<string | null, { readonly body: string; readonly reply: Delivery["reply"] }>()

export const getSentEmails = (recipient?: string): SentEmail[] =>
  sentEmails.filter(({ to }) => recipient === undefined || to.includes(recipient))

const resetResend = (): void => {
  sentEmails.length = 0
  idempotentRequests.clear()
}

const refuse = (statusCode: number, name: ErrorResponse["name"], message: string) => ({
  reason: `${name}: ${message}`,
  response: Response.json({ message, name, statusCode } satisfies ErrorResponse, { status: statusCode }),
})

interface Delivery {
  readonly emails: readonly { readonly email: zod.infer<typeof sendEmailSchema>; readonly id: string }[]
  readonly reply:
    | CreateEmailResponseSuccess
    | {
        readonly data: readonly CreateEmailResponseSuccess[]
        readonly errors?: readonly { readonly index: number; readonly message: string }[]
      }
}

const deliver = async (request: Request, parse: (body: unknown) => zod.ZodSafeParseResult<Delivery>) => {
  const idempotencyKey = request.headers.get("Idempotency-Key")
  if (idempotencyKey !== null && (idempotencyKey.length === 0 || idempotencyKey.length > IDEMPOTENCY_KEY_MAX_LENGTH)) {
    return refuse(HTTP_STATUS.BAD_REQUEST, "invalid_idempotency_key", "Key must be between 1 and 256 characters.")
  }
  const body = await request.text()
  const delivery = parse(JSON.parse(body))
  if (!delivery.success) {
    return refuse(HTTP_STATUS.UNPROCESSABLE_CONTENT, "validation_error", zod.prettifyError(delivery.error))
  }
  const previous = idempotentRequests.get(idempotencyKey)
  if (previous !== undefined && previous.body !== body) {
    return refuse(HTTP_STATUS.CONFLICT, "invalid_idempotent_request", "Same idempotency key used with a different request payload.")
  }
  if (previous !== undefined) {
    return Response.json(previous.reply)
  }
  sentEmails.push(...delivery.data.emails.map(({ email, id }) => ({ ...email, id, idempotencyKey, to: [email.to].flat() })))
  if (idempotencyKey !== null) {
    idempotentRequests.set(idempotencyKey, { body, reply: delivery.data.reply })
  }
  return Response.json(delivery.data.reply)
}

const singleDelivery = sendEmailSchema.transform((email): Delivery => {
  const id = crypto.randomUUID()
  return { emails: [{ email, id }], reply: { id } }
})

const batchDelivery = sendBatchSchema.transform((emails): Delivery => {
  const sent = emails.map((email) => ({ email, id: crypto.randomUUID() }))
  return { emails: sent, reply: { data: sent.map(({ id }) => ({ id })) } }
})

const permissiveBatchDelivery = zod
  .array(zod.unknown())
  .min(1)
  .max(RESEND_BATCH_LIMIT)
  .transform((items): Delivery => {
    const checked = items.map((item, index) => ({ index, result: sendEmailSchema.safeParse(item) }))
    const sent = checked.flatMap(({ result }) => (result.success ? [{ email: result.data, id: crypto.randomUUID() }] : []))
    const errors = checked.flatMap(({ index, result }) => (result.success ? [] : [{ index, message: zod.prettifyError(result.error) }]))
    return { emails: sent, reply: { data: sent.map(({ id }) => ({ id })), errors } }
  })

const PERMISSIVE = "permissive"

const ROUTES = new Map<string, zod.ZodType<Delivery>>([
  [EMAILS_PATH, singleDelivery],
  [BATCH_PATH, batchDelivery],
])

export const resendApi = {
  origin: new URL(resendClient().baseUrl).origin,
  reset: resetResend,
  respond: async (request: Request) => {
    if (request.headers.get("Authorization") !== `Bearer ${env.RESEND_API_KEY}`) {
      return refuse(HTTP_STATUS.UNAUTHORIZED, "missing_api_key", "Missing or invalid API key in the authorization header.")
    }
    const path = new URL(request.url).pathname
    const route =
      path === BATCH_PATH && request.headers.get("x-batch-validation") === PERMISSIVE ? permissiveBatchDelivery : ROUTES.get(path)
    if (request.method !== "POST" || route === undefined) {
      return refuse(HTTP_STATUS.NOT_FOUND, "not_found", `The test double does not serve ${request.method} ${request.url}`)
    }
    return deliver(request, (body) => route.safeParse(body))
  },
}

export const RESEND_PROVIDER_DOUBLES = [resendApi] as const satisfies readonly ProviderDouble[]
