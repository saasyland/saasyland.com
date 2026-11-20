import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"

import { VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"
import type { Verification } from "~/src/modules/verification/verification.types"
import { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

import { recipientAllowance } from "~/src/lib/rate-limit"

export const sendVerificationEmail = createServerFn({ method: "POST" })
  .middleware([withRateLimit("send-verification-email", RATE_LIMITS.SENSITIVE)])
  .validator((input: Verification["sendVerificationEmail"]) => verificationZodSchemas.sendVerificationEmail.parse(input))
  .handler(async ({ context, data }) => {
    const { allowed, retryAfter } = await recipientAllowance({ kind: EMAIL_PURPOSE.VERIFY_EMAIL, recipient: data.email })

    if (!allowed) {
      return { retryAfterSeconds: retryAfter, sent: false } as const
    }

    await auth.api.sendVerificationEmail({ body: data, headers: context.requestHeaders })

    return { sent: true } as const
  })

export const sendVerificationEmailMutation = mutationOptions({
  mutationFn: (data: Verification["sendVerificationEmail"]) => sendVerificationEmail({ data }),
  mutationKey: VERIFICATION_MUTATION_KEYS.SEND_EMAIL,
})
