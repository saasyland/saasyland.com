import type * as zod from "zod"

import type { user } from "~/src/modules/user/user.schema"
import type { userZodSchemas } from "~/src/modules/user/user.zod"

export interface User {
  select: typeof user.$inferSelect
  insert: typeof user.$inferInsert
  banUser: zod.input<typeof userZodSchemas.banUser>
  createUser: zod.input<typeof userZodSchemas.createUser>
  deleteUser: zod.input<typeof userZodSchemas.deleteUser>
  getUser: zod.input<typeof userZodSchemas.getUser>
  getUsers: zod.input<typeof userZodSchemas.getUsers>
  impersonateUser: zod.input<typeof userZodSchemas.impersonateUser>
  setUserPassword: zod.input<typeof userZodSchemas.setUserPassword>
  setUserPasswordForm: zod.input<typeof userZodSchemas.setUserPasswordForm>
  setUserRole: zod.input<typeof userZodSchemas.setUserRole>
  unbanUser: zod.input<typeof userZodSchemas.unbanUser>
  updateUser: zod.input<typeof userZodSchemas.updateUser>
}
