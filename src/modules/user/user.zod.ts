import * as zod from "zod"

import { ROLE_VALUES } from "~/src/integrations/better-auth/auth.roles"
import {
  callbackPathSchema,
  emailSchema,
  nameSchema,
  signInPasswordSchema,
  strictPasswordSchema,
} from "~/src/integrations/better-auth/auth.zod"

import { choiceOf, flagFilterField, paginationSchema, searchTextField, sortingOf } from "~/src/modules/_core/utils/pagination"
import { searchSchema } from "~/src/modules/_core/utils/search"
import { timeRangeSchema } from "~/src/modules/_core/utils/time-series"
import { MIN_FIELD_LENGTH, dateRangeField, idField } from "~/src/modules/_core/utils/zod-fields"
import { BAN_REASON_MAX_LENGTH, TIMEZONE_CODES, USER_SORT_COLUMNS, USER_STATUSES } from "~/src/modules/user/user.constants"

const timezone = zod.enum(TIMEZONE_CODES)

const userIdInput = zod.object({
  userId: idField,
})

const banUser = zod.object({
  banExpiresIn: zod.int().positive().optional(),
  banReason: zod.string().trim().max(BAN_REASON_MAX_LENGTH).optional(),
  userId: idField,
})

const confirmAccountDeletion = zod.object({
  token: zod.string().min(MIN_FIELD_LENGTH),
})

const createUser = zod.object({
  email: emailSchema,
  name: nameSchema,
  password: strictPasswordSchema,
  role: zod.enum(ROLE_VALUES),
})

const deleteUser = userIdInput

const getUser = userIdInput

const getUserSignups = timeRangeSchema

const userFilters = zod.object({
  createdAt: dateRangeField.optional(),
  emailVerified: flagFilterField.optional(),
  role: zod.array(choiceOf(ROLE_VALUES)).max(ROLE_VALUES.length).optional(),
  status: zod.array(choiceOf(USER_STATUSES)).max(USER_STATUSES.length).optional(),
  timezone: zod.array(choiceOf(TIMEZONE_CODES)).max(TIMEZONE_CODES.length).optional(),
  twoFactorEnabled: flagFilterField.optional(),
  updatedAt: dateRangeField.optional(),
  user: searchTextField.optional(),
})

const getUsers = paginationSchema.extend({
  filters: userFilters.default({}),
  search: searchTextField.default(""),
  sorting: sortingOf(USER_SORT_COLUMNS),
})

const impersonateUser = userIdInput

const requestAccountDeletion = zod.object({
  callbackURL: callbackPathSchema,
  password: signInPasswordSchema.optional(),
})

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

const searchUsers = searchSchema

export const userZodSchemas = {
  banUser,
  confirmAccountDeletion,
  createUser,
  deleteUser,
  getUser,
  getUserSignups,
  getUsers,
  impersonateUser,
  requestAccountDeletion,
  searchUsers,
  setUserPassword,
  setUserPasswordForm,
  setUserRole,
  unbanUser,
  updatePreferences,
  updateUser,
}
