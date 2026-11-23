import * as zod from "zod"

import { emailSchema, nameSchema } from "~/src/integrations/better-auth/auth.zod"

import { MIN_FIELD_LENGTH, idField, localeField } from "~/src/modules/_core/utils/zod-fields"
import { WITHDRAWAL_REFERENCE_MAX_LENGTH } from "~/src/modules/withdrawal/withdrawal.constants"

const referenceField = zod
  .string()
  .trim()
  .min(MIN_FIELD_LENGTH, { message: "referenceRequired" })
  .max(WITHDRAWAL_REFERENCE_MAX_LENGTH, { message: "referenceMaxLength" })

const submitWithdrawal = zod.object({
  email: emailSchema,
  locale: localeField,
  name: zod.string().trim().pipe(nameSchema),
  reference: referenceField,
})

const getUserWithdrawals = zod.object({
  userId: idField,
})

export const withdrawalZodSchemas = {
  getUserWithdrawals,
  submitWithdrawal,
}
