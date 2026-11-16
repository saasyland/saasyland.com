import zod from "zod/v4"

import { emailSchema, strictPasswordSchema, withMatchingPasswords } from "~/src/integrations/better-auth/auth.zod"

import { MIN_FIELD_LENGTH } from "~/src/modules/_core/utils/zod-fields"

const forgotPassword = zod.object({
  email: emailSchema,
})

const resetPasswordForm = withMatchingPasswords(
  zod.object({
    confirmPassword: zod.string().min(MIN_FIELD_LENGTH, { message: "confirmPasswordRequired" }),
    password: strictPasswordSchema,
  }),
)

const tokenField = zod.string().min(MIN_FIELD_LENGTH, { message: "tokenRequired" })

const redirectToField = zod.string().min(MIN_FIELD_LENGTH, { message: "redirectToRequired" })

const requestPasswordReset = forgotPassword.extend({
  redirectTo: redirectToField,
})

const resetPassword = resetPasswordForm.extend({
  token: tokenField,
})

const sendVerificationEmail = zod.object({
  callbackURL: redirectToField,
  email: emailSchema,
})

export const verificationZodSchemas = {
  forgotPassword,
  requestPasswordReset,
  resetPassword,
  resetPasswordForm,
  sendVerificationEmail,
}
