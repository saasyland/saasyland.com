import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { TWO_FACTOR_MUTATION_KEYS } from "~/src/modules/two-factor/two-factor.constants"
import type { TwoFactor } from "~/src/modules/two-factor/two-factor.types"
import { twoFactorZodSchemas } from "~/src/modules/two-factor/two-factor.zod"

export const verifyBackupCode = createServerFn({ method: "POST" })
  .middleware([withRateLimit("verify-backup-code", RATE_LIMITS.SENSITIVE)])
  .validator((input: TwoFactor["verifyBackupCode"]) => twoFactorZodSchemas.verifyBackupCode.parse(input))
  .handler(({ context, data }) =>
    auth.api.verifyBackupCode({
      body: {
        code: data.code,
        trustDevice: data.trustDevice,
      },
      headers: context.requestHeaders,
    }),
  )

export const verifyBackupCodeMutation = mutationOptions({
  mutationFn: (data: TwoFactor["verifyBackupCode"]) => verifyBackupCode({ data }),
  mutationKey: TWO_FACTOR_MUTATION_KEYS.VERIFY_BACKUP_CODE,
})
