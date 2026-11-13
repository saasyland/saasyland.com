import type * as zod from "zod"

import type { account } from "~/src/modules/account/account.schema"
import type { accountZodSchemas } from "~/src/modules/account/account.zod"

export interface Account {
  select: typeof account.$inferSelect
  insert: typeof account.$inferInsert
  changeEmail: zod.input<typeof accountZodSchemas.changeEmail>
  changePassword: zod.input<typeof accountZodSchemas.changePassword>
  changePasswordForm: zod.input<typeof accountZodSchemas.changePasswordForm>
  signUpWithPassword: zod.input<typeof accountZodSchemas.signUpWithPassword>
  updateUser: zod.input<typeof accountZodSchemas.updateUser>
}
