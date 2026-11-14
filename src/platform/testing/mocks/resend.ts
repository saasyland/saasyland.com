import { env } from "cloudflare:workers"

import type { CreateEmailResponseSuccess, EmailApiOptions, ErrorResponse } from "resend"
import * as zod from "zod"

import { resend } from "~/src/integrations/resend/resend.config"

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
  html: zod.string().min(1),
  subject: zod.string().min(1),
  to: zod.union([address, zod.array(address).min(1).max(MAX_RECIPIENTS)]),
} satisfies { readonly [Key in keyof EmailApiOptions]?: zod.ZodType<EmailApiOptions[Key]> })

export interface SentEmail {
  readonly from: string
  readonly html: string
  readonly id: string
  readonly idempotencyKey: string | null
  readonly subject: string
  readonly to: readonly string[]
}

const sentEmails: SentEmail[] = []
const idempotentRequests = new Map<string, { readonly body: string; readonly id: string }>()

export const getSentEmails = (recipient?: string): SentEmail[] =>
  sentEmails.filter(({ to }) => recipient === undefined || to.includes(recipient))

export const resetResend = (): void => {
  sentEmails.length = 0
  idempotentRequests.clear()
}

const refuse = (statusCode: number, name: ErrorResponse["name"], message: string) => ({
  reason: `${name}: ${message}`,
  response: Response.json({ message, name, statusCode } satisfies ErrorResponse, { status: statusCode }),
})

const sendEmail = async (request: Request) => {
  const idempotencyKey = request.headers.get("Idempotency-Key")
  if (idempotencyKey !== null && (idempotencyKey.length === 0 || idempotencyKey.length > IDEMPOTENCY_KEY_MAX_LENGTH)) {
    return refuse(HTTP_STATUS.BAD_REQUEST, "invalid_idempotency_key", "Key must be between 1 and 256 characters.")
  }
  const body = await request.text()
  const email = sendEmailSchema.safeParse(JSON.parse(body))
  if (!email.success) {
    return refuse(HTTP_STATUS.UNPROCESSABLE_CONTENT, "validation_error", zod.prettifyError(email.error))
  }
  const previous = idempotencyKey === null ? undefined : idempotentRequests.get(idempotencyKey)
  if (previous !== undefined && previous.body !== body) {
    return refuse(HTTP_STATUS.CONFLICT, "invalid_idempotent_request", "Same idempotency key used with a different request payload.")
  }
  const id = previous?.id ?? crypto.randomUUID()
  if (previous === undefined) {
    sentEmails.push({ ...email.data, id, idempotencyKey, to: [email.data.to].flat() })
  }
  if (idempotencyKey !== null) {
    idempotentRequests.set(idempotencyKey, { body, id })
  }
  return Response.json({ id } satisfies CreateEmailResponseSuccess)
}

export const resendApi = {
  origin: new URL(resend.baseUrl).origin,
  respond: async (request: Request) => {
    if (request.headers.get("Authorization") !== `Bearer ${env.RESEND_API_KEY}`) {
      return refuse(HTTP_STATUS.UNAUTHORIZED, "missing_api_key", "Missing or invalid API key in the authorization header.")
    }
    if (request.method !== "POST" || new URL(request.url).pathname !== "/emails") {
      return refuse(HTTP_STATUS.NOT_FOUND, "not_found", `The test double does not serve ${request.method} ${request.url}`)
    }
    return sendEmail(request)
  },
}
