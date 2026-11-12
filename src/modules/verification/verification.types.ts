import type * as zod from "zod"

import type { verification } from "~/src/modules/verification/verification.schema"
import type { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

export interface Verification {
  select: typeof verification.$inferSelect
  insert: typeof verification.$inferInsert
  requestPasswordReset: zod.input<typeof verificationZodSchemas.requestPasswordReset>
  resetPassword: zod.input<typeof verificationZodSchemas.resetPassword>
  sendVerificationEmail: zod.input<typeof verificationZodSchemas.sendVerificationEmail>
}
