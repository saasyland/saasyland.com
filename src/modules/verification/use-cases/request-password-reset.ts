import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"

import { VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"
import type { Verification } from "~/src/modules/verification/verification.types"
import { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

import { recipientAllowance } from "~/src/lib/rate-limit"

export const requestPasswordReset = createServerFn({ method: "POST" })
  .middleware([withRateLimit("request-password-reset", RATE_LIMITS.SENSITIVE)])
  .validator((input: Verification["requestPasswordReset"]) => verificationZodSchemas.requestPasswordReset.parse(input))
  .handler(async ({ context, data }) => {
    const { allowed, retryAfter } = await recipientAllowance({ kind: EMAIL_PURPOSE.RESET_PASSWORD, recipient: data.email })

    if (!allowed) {
      return { retryAfterSeconds: retryAfter, sent: false } as const
    }

    await auth.api.requestPasswordReset({ body: data, headers: context.requestHeaders })

    return { sent: true } as const
  })

export const requestPasswordResetMutation = mutationOptions({
  mutationFn: (data: Verification["requestPasswordReset"]) => requestPasswordReset({ data }),
  mutationKey: VERIFICATION_MUTATION_KEYS.REQUEST_PASSWORD_RESET,
})
