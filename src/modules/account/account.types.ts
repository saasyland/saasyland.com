import type * as zod from "zod"

import type { account } from "~/src/modules/account/account.schema"
import type { accountZodSchemas } from "~/src/modules/account/account.zod"
import type { listAccounts } from "~/src/modules/account/use-cases/list-accounts"

export interface Account {
  select: typeof account.$inferSelect
  insert: typeof account.$inferInsert
  changeEmail: zod.input<typeof accountZodSchemas.changeEmail>
  changePassword: zod.input<typeof accountZodSchemas.changePassword>
  linked: Awaited<ReturnType<typeof listAccounts>>[number]
  setPassword: zod.input<typeof accountZodSchemas.setPassword>
  signUpWithPassword: zod.input<typeof accountZodSchemas.signUpWithPassword>
  unlinkAccount: zod.input<typeof accountZodSchemas.unlinkAccount>
  updateUser: zod.input<typeof accountZodSchemas.updateUser>
}
