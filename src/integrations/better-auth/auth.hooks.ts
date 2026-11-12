import "@tanstack/react-start/server-only"

import { APIError, createAuthMiddleware } from "better-auth/api"
import zod from "zod/v4"

import { emailSchema, imageUrlSchema, nameSchema, strictPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { ROUTES } from "~/src/routes"

const passwordChange = zod.object({ newPassword: strictPasswordSchema })

const INPUT_POLICY: Readonly<Record<string, zod.ZodType>> = {
  [ROUTES.API_AUTH.ADMIN_CREATE_USER]: zod.object({ email: emailSchema, name: nameSchema, password: strictPasswordSchema }),
  [ROUTES.API_AUTH.ADMIN_SET_USER_PASSWORD]: passwordChange,
  [ROUTES.API_AUTH.ADMIN_UPDATE_USER]: zod.object({
    data: zod.object({ email: emailSchema.optional(), image: imageUrlSchema.nullish(), name: nameSchema.optional() }),
  }),
  [ROUTES.API_AUTH.CHANGE_EMAIL]: zod.object({ newEmail: emailSchema }),
  [ROUTES.API_AUTH.CHANGE_PASSWORD]: passwordChange,
  [ROUTES.API_AUTH.RESET_PASSWORD]: passwordChange,
  [ROUTES.API_AUTH.SIGN_UP_EMAIL]: zod.object({
    email: emailSchema,
    image: imageUrlSchema.optional(),
    name: nameSchema,
    password: strictPasswordSchema,
  }),
  [ROUTES.API_AUTH.UPDATE_USER]: zod.object({ image: imageUrlSchema.nullish(), name: nameSchema.optional() }),
}

export const enforceInputPolicy = createAuthMiddleware(async ({ body, path }) => {
  const policy = INPUT_POLICY[path]
  const result = policy === undefined ? undefined : await policy.safeParseAsync(body)

  if (result?.success === false) {
    throw APIError.from("BAD_REQUEST", { code: "VALIDATION_ERROR", message: "The request does not meet the input policy" })
  }
})
