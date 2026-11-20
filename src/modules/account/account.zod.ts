import zod from "zod/v4"

import {
  callbackPathSchema,
  emailSchema,
  nameSchema,
  signInPasswordSchema,
  signUpWithPasswordSchema,
  strictPasswordSchema,
} from "~/src/integrations/better-auth/auth.zod"

const changeEmail = zod.object({
  callbackURL: callbackPathSchema,
  newEmail: emailSchema,
})

const changePassword = zod.object({
  currentPassword: signInPasswordSchema,
  newPassword: strictPasswordSchema,
  revokeOtherSessions: zod.boolean().optional(),
})

const changePasswordForm = changePassword.pick({ currentPassword: true, newPassword: true })

const updateUser = zod.object({
  name: nameSchema,
})

export const accountZodSchemas = {
  changeEmail,
  changePassword,
  changePasswordForm,
  signUpWithPassword: signUpWithPasswordSchema,
  updateUser,
}
