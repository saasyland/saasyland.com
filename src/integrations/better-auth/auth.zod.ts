import zod from "zod/v4"

import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_SPECIAL_CHAR_PATTERN,
  PASSWORD_UPPERCASE_PATTERN,
} from "~/src/integrations/better-auth/auth.constraints"

import { MIN_FIELD_LENGTH } from "~/src/modules/_core/utils/zod-fields"

const INTERNAL_PATH_PATTERN = /^\/(?!\/)/u

export const callbackPathSchema = zod.string().regex(INTERNAL_PATH_PATTERN)

export const emailSchema = zod.email({ message: "emailInvalid" }).max(EMAIL_MAX_LENGTH, {
  message: "emailMaxLength",
})

export const nameSchema = zod.string().min(MIN_FIELD_LENGTH, { message: "nameRequired" }).max(NAME_MAX_LENGTH, { message: "nameMaxLength" })

export const signInPasswordSchema = zod.string().min(MIN_FIELD_LENGTH, { message: "passwordRequired" })

export const strictPasswordSchema = zod
  .string()
  .min(MIN_FIELD_LENGTH, { message: "passwordRequired" })
  .min(PASSWORD_MIN_LENGTH, { message: "passwordMinLength" })
  .max(PASSWORD_MAX_LENGTH, { message: "passwordMaxLength" })
  .refine((value) => PASSWORD_UPPERCASE_PATTERN.test(value), {
    message: "passwordUppercase",
  })
  .refine((value) => PASSWORD_SPECIAL_CHAR_PATTERN.test(value), {
    message: "passwordSpecialCharacter",
  })

export const withMatchingPasswords = <TValue extends zod.ZodType<{ confirmPassword: string; password: string }>>(schema: TValue) =>
  schema.refine((data) => data.password === data.confirmPassword, {
    message: "passwordsMustMatch",
    path: ["confirmPassword"],
  })

const passwordConfirmationSchema = zod.object({
  confirmPassword: zod.string().min(MIN_FIELD_LENGTH, { message: "confirmPasswordRequired" }),
  password: strictPasswordSchema,
})

const emailFormSchema = zod.object({
  email: emailSchema,
})

export const signUpWithPasswordSchema = withMatchingPasswords(
  passwordConfirmationSchema.extend({
    callbackURL: callbackPathSchema.optional(),
    email: emailSchema,
    name: nameSchema,
  }),
)

export const signInWithPasswordSchema = emailFormSchema.extend({
  password: signInPasswordSchema,
})
