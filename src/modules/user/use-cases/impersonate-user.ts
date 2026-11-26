import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { settleQueries } from "~/src/lib/settle-queries"

export const impersonateUser = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["impersonate"] })])
  .validator((input: User["impersonateUser"]) => userZodSchemas.impersonateUser.parse(input))
  .handler(({ context, data }) => auth.api.impersonateUser({ body: data, headers: context.requestHeaders }))

export const impersonateUserMutation = mutationOptions({
  mutationFn: async (data: User["impersonateUser"], { client }) => {
    await settleQueries(client)
    return impersonateUser({ data })
  },
  mutationKey: USER_MUTATION_KEYS.IMPERSONATE,
})
