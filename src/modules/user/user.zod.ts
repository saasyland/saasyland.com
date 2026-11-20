import zod from "zod/v4"

import { ROLE_VALUES } from "~/src/integrations/better-auth/auth.roles"
import { emailSchema, nameSchema, strictPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { paginationSchema } from "~/src/modules/_core/utils/pagination"
import { timeRangeSchema } from "~/src/modules/_core/utils/time-series"
import { idField } from "~/src/modules/_core/utils/zod-fields"
import { BAN_REASON_MAX_LENGTH, TIMEZONE_CODES } from "~/src/modules/user/user.constants"

const MAX_SORT_COLUMNS = 8

const timezone = zod.enum(TIMEZONE_CODES)

const userIdInput = zod.object({
  userId: idField,
})

const banUser = zod.object({
  banExpiresIn: zod.int().positive().optional(),
  banReason: zod.string().trim().max(BAN_REASON_MAX_LENGTH).optional(),
  userId: idField,
})

const createUser = zod.object({
  email: emailSchema,
  name: nameSchema,
  password: strictPasswordSchema,
  role: zod.enum(ROLE_VALUES),
})

const deleteUser = userIdInput

const getUser = userIdInput

const userSortSchema = zod.object({
  desc: zod.boolean(),
  id: zod.string().pipe(zod.enum(["user", "role", "status", "emailVerified", "twoFactorEnabled", "timezone", "createdAt", "updatedAt"])),
})

const getUserSignups = timeRangeSchema

const getUsers = paginationSchema.extend({ sorting: zod.array(userSortSchema).max(MAX_SORT_COLUMNS).default([]) })

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

const updatePreferences = zod.object({ timezone })

const updateUser = zod.object({
  name: nameSchema,
  userId: idField,
})

export const userZodSchemas = {
  banUser,
  createUser,
  deleteUser,
  getUser,
  getUserSignups,
  getUsers,
  impersonateUser,
  setUserPassword,
  setUserPasswordForm,
  setUserRole,
  unbanUser,
  updatePreferences,
  updateUser,
}
