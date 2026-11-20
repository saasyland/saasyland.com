import zod from "zod/v4"

import {
  EMAIL_MAX_LENGTH,
  IMAGE_URL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "~/src/integrations/better-auth/auth.constraints"

import { MIN_FIELD_LENGTH } from "~/src/modules/_core/utils/zod-fields"

import { searchParam } from "~/src/lib/search-params"

const INTERNAL_PATH_PATTERN = /^\/(?![/\\])/u

export const callbackPathSchema = zod.string().regex(INTERNAL_PATH_PATTERN)

export const authSearchSchema = zod.object({
  redirect: searchParam(callbackPathSchema),
})

export type AuthSearch = zod.infer<typeof authSearchSchema>

export const emailSchema = zod.email({ message: "emailInvalid" }).max(EMAIL_MAX_LENGTH, {
  message: "emailMaxLength",
})

export const imageUrlSchema = zod.string().max(IMAGE_URL_MAX_LENGTH)

export const nameSchema = zod.string().min(MIN_FIELD_LENGTH, { message: "nameRequired" }).max(NAME_MAX_LENGTH, { message: "nameMaxLength" })

export const signInPasswordSchema = zod.string().min(MIN_FIELD_LENGTH, { message: "passwordRequired" })

export const strictPasswordSchema = zod
  .string()
  .min(MIN_FIELD_LENGTH, { message: "passwordRequired" })
  .min(PASSWORD_MIN_LENGTH, { message: "passwordMinLength" })
  .max(PASSWORD_MAX_LENGTH, { message: "passwordMaxLength" })

const emailFormSchema = zod.object({
  email: emailSchema,
})

export const signUpWithPasswordSchema = zod.object({
  callbackURL: callbackPathSchema.optional(),
  email: emailSchema,
  name: nameSchema,
  password: strictPasswordSchema,
})

export const signInWithPasswordSchema = emailFormSchema.extend({
  password: signInPasswordSchema,
})
