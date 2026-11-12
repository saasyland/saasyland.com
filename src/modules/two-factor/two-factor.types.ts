import type * as zod from "zod"

import type { twoFactor } from "~/src/modules/two-factor/two-factor.schema"
import type { twoFactorZodSchemas } from "~/src/modules/two-factor/two-factor.zod"

export interface TwoFactor {
  select: typeof twoFactor.$inferSelect
  insert: typeof twoFactor.$inferInsert
  disableTwoFactor: zod.input<typeof twoFactorZodSchemas.disableTwoFactor>
  enableTwoFactor: zod.input<typeof twoFactorZodSchemas.enableTwoFactor>
  verifyBackupCode: zod.input<typeof twoFactorZodSchemas.verifyBackupCode>
  verifyTotp: zod.input<typeof twoFactorZodSchemas.verifyTotp>
}
