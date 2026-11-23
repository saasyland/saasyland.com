import "@tanstack/react-start/server-only"

import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api"
import { setSessionCookie } from "better-auth/cookies"
import * as zod from "zod"

import { pageCallbackURL } from "~/src/integrations/better-auth/auth.callbacks"
import { emailSchema, imageUrlSchema, nameSchema, strictPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { AUTH_EMAILS } from "~/src/data/auth-emails"

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
  [ROUTES.API_AUTH.SET_PASSWORD]: passwordChange,
  [ROUTES.API_AUTH.SIGN_UP_EMAIL]: zod.object({
    email: emailSchema,
    image: imageUrlSchema.optional(),
    name: nameSchema,
    password: strictPasswordSchema,
  }),
  [ROUTES.API_AUTH.UPDATE_USER]: zod.object({ image: imageUrlSchema.nullish(), name: nameSchema.optional() }),
}

const signUpResponseSchema = zod.object({ user: zod.object({ id: zod.string() }) })

const passwordChangeResponseSchema = zod.object({ user: zod.object({ email: zod.string(), name: zod.string() }) })

export const enforceInputPolicy = createAuthMiddleware(async ({ body, path }) => {
  const result = await INPUT_POLICY[path]?.safeParseAsync(body)

  if (result?.success === false) {
    throw APIError.from("BAD_REQUEST", { code: "VALIDATION_ERROR", message: "The request does not meet the input policy" })
  }
})

export const signInNewAccount = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== ROUTES.API_AUTH.SIGN_UP_EMAIL) {
    return
  }

  const response = signUpResponseSchema.safeParse(ctx.context.returned)

  if (!response.success) {
    return
  }

  const created = await ctx.context.internalAdapter.findUserById(response.data.user.id)

  if (created === null) {
    return
  }

  const session = await ctx.context.internalAdapter.createSession(created.id)
  await setSessionCookie(ctx, { session, user: created })
})

export const requireVerifiedEmail = createAuthMiddleware(async (ctx) => {
  const session = await getSessionFromCtx(ctx)

  if (session?.user.emailVerified === false) {
    throw APIError.from("FORBIDDEN", { code: "EMAIL_NOT_VERIFIED", message: "Confirm the email address of this account first" })
  }
})

const sendPasswordChangeNotice = async (recipient: { readonly email: string; readonly name: string }): Promise<void> => {
  try {
    await AUTH_EMAILS.sendPasswordChanged({ callbackURL: pageCallbackURL(), user: recipient })
  } catch (error) {
    console.error("[email] the password change notice could not be sent", error)
  }
}

export const notifyPasswordChange = createAuthMiddleware(async (ctx) => {
  const response = passwordChangeResponseSchema.safeParse(ctx.context.returned)

  if (!response.success) {
    return
  }

  await ctx.context.runInBackgroundOrAwait(sendPasswordChangeNotice(response.data.user))
})
