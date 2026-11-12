import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type { Account } from "~/src/modules/account/account.types"
import { accountZodSchemas } from "~/src/modules/account/account.zod"

export const updateUser = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: Account["updateUser"]) => accountZodSchemas.updateUser.parse(input))
  .handler(({ context, data }) => auth.api.updateUser({ body: data, headers: context.requestHeaders }))

export const updateUserMutation = mutationOptions({
  mutationFn: (data: Account["updateUser"]) => updateUser({ data }),
  mutationKey: ACCOUNT_MUTATION_KEYS.UPDATE_USER,
})
