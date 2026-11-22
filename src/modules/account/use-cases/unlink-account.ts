import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type { Account } from "~/src/modules/account/account.types"
import { accountZodSchemas } from "~/src/modules/account/account.zod"

export const unlinkAccount = createServerFn({ method: "POST" })
  .middleware([withRateLimit("unlink-account", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: Account["unlinkAccount"]) => accountZodSchemas.unlinkAccount.parse(input))
  .handler(({ context, data }) => auth.api.unlinkAccount({ body: data, headers: context.requestHeaders }))

export const unlinkAccountMutation = mutationOptions({
  mutationFn: (data: Account["unlinkAccount"]) => unlinkAccount({ data }),
  mutationKey: ACCOUNT_MUTATION_KEYS.UNLINK,
})
