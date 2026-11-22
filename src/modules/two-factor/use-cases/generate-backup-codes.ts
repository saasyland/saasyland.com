import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { TWO_FACTOR_MUTATION_KEYS } from "~/src/modules/two-factor/two-factor.constants"
import type { TwoFactor } from "~/src/modules/two-factor/two-factor.types"
import { twoFactorZodSchemas } from "~/src/modules/two-factor/two-factor.zod"

export const generateBackupCodes = createServerFn({ method: "POST" })
  .middleware([withRateLimit("generate-backup-codes", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: TwoFactor["generateBackupCodes"]) => twoFactorZodSchemas.generateBackupCodes.parse(input))
  .handler(({ context, data }) => auth.api.generateBackupCodes({ body: data, headers: context.requestHeaders }))

export const generateBackupCodesMutation = mutationOptions({
  mutationFn: (data: TwoFactor["generateBackupCodes"]) => generateBackupCodes({ data }),
  mutationKey: TWO_FACTOR_MUTATION_KEYS.GENERATE_BACKUP_CODES,
})
