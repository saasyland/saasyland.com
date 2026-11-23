import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { pageCallbackURL } from "~/src/integrations/better-auth/auth.callbacks"
import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type { Account } from "~/src/modules/account/account.types"
import { accountZodSchemas } from "~/src/modules/account/account.zod"
import { sendPasswordChangedEmail } from "~/src/modules/account/use-cases/send-password-changed-email"

export const setPassword = createServerFn({ method: "POST" })
  .middleware([withRateLimit("set-password", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: Account["setPassword"]) => accountZodSchemas.setPassword.parse(input))
  .handler(async ({ context, data }) => {
    await auth.api.setPassword({ body: data, headers: context.requestHeaders })
    await auth.api.revokeOtherSessions({ headers: context.requestHeaders })
    await sendPasswordChangedEmail({ callbackURL: pageCallbackURL(), user: context.auth.user })

    return { status: true }
  })

export const setPasswordMutation = mutationOptions({
  mutationFn: (data: Account["setPassword"]) => setPassword({ data }),
  mutationKey: ACCOUNT_MUTATION_KEYS.SET_PASSWORD,
})
