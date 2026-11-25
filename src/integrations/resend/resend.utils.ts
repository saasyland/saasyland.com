import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import type { JSX } from "react"

import { resendClient } from "~/src/integrations/resend/resend.config"

import { sha256Hex } from "~/src/lib/hex"

interface EmailIdempotency {
  readonly purpose: string
  readonly token: string
}

interface SendEmailOptions {
  readonly from?: string
  readonly idempotency: EmailIdempotency
  readonly react: JSX.Element
  readonly subject: string
  readonly to: string
}

const idempotencyKey = async ({ purpose, token }: EmailIdempotency): Promise<string> => `${purpose}/${await sha256Hex(token)}`

interface BatchEmail {
  readonly headers: Readonly<Record<string, string>>
  readonly react: JSX.Element
  readonly subject: string
  readonly to: string
}

interface SendBatchEmailsOptions {
  readonly emails: readonly BatchEmail[]
  readonly from?: string
  readonly idempotency: EmailIdempotency
}

export const sendEmail = async ({ from = env.RESEND_EMAIL_FROM, idempotency, react, subject, to }: SendEmailOptions): Promise<string> => {
  const { data, error } = await resendClient().emails.send(
    { from, react, subject, to },
    { idempotencyKey: await idempotencyKey(idempotency) },
  )

  if (error) {
    throw new Error(`Failed to send "${subject}" to ${to}: ${error.message}`)
  }

  return data.id
}

export const sendBatchEmails = async ({ emails, from = env.RESEND_EMAIL_FROM, idempotency }: SendBatchEmailsOptions): Promise<string[]> => {
  const { data, error } = await resendClient().batch.send(
    emails.map(({ headers, react, subject, to }) => ({ from, headers: { ...headers }, react, subject, to })),
    { batchValidation: "permissive", idempotencyKey: await idempotencyKey(idempotency) },
  )

  if (error) {
    throw new Error(`Failed to send a batch of ${String(emails.length)} emails for ${idempotency.purpose}: ${error.message}`)
  }

  for (const refusal of data.errors) {
    console.warn(`[resend] ${idempotency.purpose}: Resend refused email ${String(refusal.index)} of a batch: ${refusal.message}`)
  }

  return data.data.map(({ id }) => id)
}
