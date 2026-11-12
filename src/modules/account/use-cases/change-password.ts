import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type { Account } from "~/src/modules/account/account.types"
import { accountZodSchemas } from "~/src/modules/account/account.zod"

export const changePassword = createServerFn({ method: "POST" })
  .middleware([withRateLimit("change-password", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: Account["changePassword"]) => accountZodSchemas.changePassword.parse(input))
  .handler(({ context, data }) =>
    auth.api.changePassword({
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: data.revokeOtherSessions ?? false,
      },
      headers: context.requestHeaders,
    }),
  )

export const changePasswordMutation = mutationOptions({
  mutationFn: (data: Account["changePassword"]) => changePassword({ data }),
  mutationKey: ACCOUNT_MUTATION_KEYS.CHANGE_PASSWORD,
})
