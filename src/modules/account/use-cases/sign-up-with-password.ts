import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type { Account } from "~/src/modules/account/account.types"
import { accountZodSchemas } from "~/src/modules/account/account.zod"

export const signUpWithPassword = createServerFn({ method: "POST" })
  .middleware([withRateLimit("sign-up", RATE_LIMITS.SENSITIVE)])
  .validator((input: Account["signUpWithPassword"]) => accountZodSchemas.signUpWithPassword.parse(input))
  .handler(({ context, data }) => {
    const request = new Request(getRequest().url, {
      body: JSON.stringify(data),
      headers: context.requestHeaders,
      method: "POST",
    })
    return auth.api.signUpEmail({ asResponse: false, body: data, headers: context.requestHeaders, request })
  })

export const signUpWithPasswordMutation = mutationOptions({
  mutationFn: (data: Account["signUpWithPassword"]) => signUpWithPassword({ data }),
  mutationKey: ACCOUNT_MUTATION_KEYS.SIGN_UP_WITH_PASSWORD,
})
