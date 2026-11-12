import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"
import type { Verification } from "~/src/modules/verification/verification.types"
import { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

export const requestPasswordReset = createServerFn({ method: "POST" })
  .middleware([withRateLimit("request-password-reset", RATE_LIMITS.SENSITIVE)])
  .validator((input: Verification["requestPasswordReset"]) => verificationZodSchemas.requestPasswordReset.parse(input))
  .handler(({ context, data }) => auth.api.requestPasswordReset({ body: data, headers: context.requestHeaders }))

export const requestPasswordResetMutation = mutationOptions({
  mutationFn: (data: Verification["requestPasswordReset"]) => requestPasswordReset({ data }),
  mutationKey: VERIFICATION_MUTATION_KEYS.REQUEST_PASSWORD_RESET,
})
