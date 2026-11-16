import zod from "zod/v4"

import {
  callbackPathSchema,
  emailSchema,
  nameSchema,
  signInPasswordSchema,
  signUpWithPasswordSchema,
  strictPasswordSchema,
} from "~/src/integrations/better-auth/auth.zod"

import { MIN_FIELD_LENGTH } from "~/src/modules/_core/utils/zod-fields"

const changeEmail = zod.object({
  callbackURL: callbackPathSchema,
  newEmail: emailSchema,
})

const changePassword = zod.object({
  currentPassword: signInPasswordSchema,
  newPassword: strictPasswordSchema,
  revokeOtherSessions: zod.boolean().optional(),
})

const changePasswordForm = zod
  .object({
    confirmNewPassword: zod.string().min(MIN_FIELD_LENGTH, { message: "confirmPasswordRequired" }),
    currentPassword: signInPasswordSchema,
    newPassword: strictPasswordSchema,
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "passwordsMustMatch",
    path: ["confirmNewPassword"],
  })

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
