import type * as zod from "zod"

import type { verification } from "~/src/modules/verification/verification.schema"
import type { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

export interface Verification {
  select: typeof verification.$inferSelect
  insert: typeof verification.$inferInsert
  forgotPassword: zod.input<typeof verificationZodSchemas.forgotPassword>
  requestPasswordReset: zod.input<typeof verificationZodSchemas.requestPasswordReset>
  resetPassword: zod.input<typeof verificationZodSchemas.resetPassword>
  resetPasswordForm: zod.input<typeof verificationZodSchemas.resetPasswordForm>
  sendVerificationEmail: zod.input<typeof verificationZodSchemas.sendVerificationEmail>
}
