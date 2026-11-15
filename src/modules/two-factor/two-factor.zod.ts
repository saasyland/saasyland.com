import zod from "zod/v4"

import { BACKUP_CODE_MAX_LENGTH, BACKUP_CODE_MIN_LENGTH, TWO_FACTOR_CODE_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { signInPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

const totpCodeField = zod
  .string()
  .min(TWO_FACTOR_CODE_LENGTH, { message: "twoFactorCodeRequired" })
  .max(TWO_FACTOR_CODE_LENGTH, { message: "twoFactorCodeLength" })

const backupCodeField = zod
  .string()
  .min(BACKUP_CODE_MIN_LENGTH, { message: "backupCodeRequired" })
  .max(BACKUP_CODE_MAX_LENGTH, { message: "backupCodeMaxLength" })

const passwordField = signInPasswordSchema

const disableTwoFactor = zod.object({
  password: passwordField,
})

const enableTwoFactor = zod.object({
  password: passwordField,
})

const verifyBackupCode = zod.object({
  code: backupCodeField,
  trustDevice: zod.boolean().optional(),
})

const verifyTotp = zod.object({
  code: totpCodeField,
  trustDevice: zod.boolean().optional(),
})

export const twoFactorZodSchemas = {
  disableTwoFactor,
  enableTwoFactor,
  verifyBackupCode,
  verifyTotp,
}
