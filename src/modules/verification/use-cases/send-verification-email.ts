import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"
import type { Verification } from "~/src/modules/verification/verification.types"
import { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

export const sendVerificationEmail = createServerFn({ method: "POST" })
  .middleware([withRateLimit("send-verification-email", RATE_LIMITS.SENSITIVE)])
  .validator((input: Verification["sendVerificationEmail"]) => verificationZodSchemas.sendVerificationEmail.parse(input))
  .handler(({ context, data }) => auth.api.sendVerificationEmail({ body: data, headers: context.requestHeaders }))

export const sendVerificationEmailMutation = mutationOptions({
  mutationFn: (data: Verification["sendVerificationEmail"]) => sendVerificationEmail({ data }),
  mutationKey: VERIFICATION_MUTATION_KEYS.SEND_EMAIL,
})
