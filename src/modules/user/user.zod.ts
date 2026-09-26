import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { ROLE_VALUES } from "~/src/integrations/better-auth/auth.access"
import { emailSchema, nameSchema, strictPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { idField } from "~/src/modules/_core/utils/zod-fields"
import { TIMEZONE_CODES, user } from "~/src/modules/user/user.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({ zodInstance: zod })

const USER_IMAGE_MAX_LENGTH = 2048
const MAX_BAN_REASON_LENGTH = 255

const userIdInput = zod.object({
  userId: idField,
})

const banUser = zod.object({
  banExpiresIn: zod.int().positive().optional(),
  banReason: zod.string().trim().max(MAX_BAN_REASON_LENGTH).optional(),
  userId: idField,
})

const createUser = zod.object({
  email: emailSchema,
  name: nameSchema,
  password: strictPasswordSchema.optional(),
  role: zod.enum(ROLE_VALUES).optional(),
})

const deleteUser = userIdInput

const getUser = userIdInput

const impersonateUser = userIdInput

const setUserPassword = zod.object({
  newPassword: strictPasswordSchema,
  userId: idField,
})

const setUserPasswordForm = zod.object({
  newPassword: strictPasswordSchema,
})

const setUserRole = zod.object({
  role: zod.enum(ROLE_VALUES),
  userId: idField,
})

const unbanUser = userIdInput

const updateUser = zod
  .object({
    image: zod.string().max(USER_IMAGE_MAX_LENGTH).nullable().optional(),
    name: nameSchema.optional(),
    timezone: zod.enum(TIMEZONE_CODES).optional(),
    userId: idField,
  })
  .refine(({ userId: _userId, ...fields }) => Object.values(fields).some((val) => val !== undefined), {
    message: "atLeastOneFieldRequired",
  })

const insert = createInsertSchema(user)
const select = createSelectSchema(user)
const update = createUpdateSchema(user)

export const userZodSchemas = {
  banUser,
  createUser,
  deleteUser,
  getUser,
  impersonateUser,
  insert,
  select,
  setUserPassword,
  setUserPasswordForm,
  setUserRole,
  unbanUser,
  update,
  updateUser,
}
