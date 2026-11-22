import zod from "zod/v4"

import {
  callbackPathSchema,
  emailSchema,
  nameSchema,
  signInPasswordSchema,
  signUpWithPasswordSchema,
  strictPasswordSchema,
} from "~/src/integrations/better-auth/auth.zod"

import { idField } from "~/src/modules/_core/utils/zod-fields"

const changeEmail = zod.object({
  callbackURL: callbackPathSchema,
  newEmail: emailSchema,
})

const changePassword = zod.object({
  currentPassword: signInPasswordSchema,
  newPassword: strictPasswordSchema,
})

const setPassword = zod.object({
  newPassword: strictPasswordSchema,
})

const unlinkAccount = zod.object({
  accountId: idField,
})

const updateUser = zod.object({
  name: nameSchema,
})

export const accountZodSchemas = {
  changeEmail,
  changePassword,
  setPassword,
  signUpWithPassword: signUpWithPasswordSchema,
  unlinkAccount,
  updateUser,
}
