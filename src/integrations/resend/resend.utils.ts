import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import type { JSX } from "react"

import { resend } from "~/src/integrations/resend/resend.config"

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

export const sendEmail = async ({
  from = env.RESEND_EMAIL_FROM,
  idempotency,
  react,
  subject,
  to,
}: Readonly<SendEmailOptions>): Promise<string> => {
  const { data, error } = await resend.emails.send({ from, react, subject, to }, { idempotencyKey: await idempotencyKey(idempotency) })

  if (error) {
    throw new Error(`Failed to send "${subject}" to ${to}: ${error.message}`)
  }

  return data.id
}
