import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type { Account } from "~/src/modules/account/account.types"
import { accountZodSchemas } from "~/src/modules/account/account.zod"

export const changeEmail = createServerFn({ method: "POST" })
  .middleware([withRateLimit("change-email", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: Account["changeEmail"]) => accountZodSchemas.changeEmail.parse(input))
  .handler(({ context, data }) => auth.api.changeEmail({ body: data, headers: context.requestHeaders }))

export const changeEmailMutation = mutationOptions({
  mutationFn: (data: Account["changeEmail"]) => changeEmail({ data }),
  mutationKey: ACCOUNT_MUTATION_KEYS.CHANGE_EMAIL,
})
