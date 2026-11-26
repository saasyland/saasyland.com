import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"

import { settleQueries } from "~/src/lib/settle-queries"

export const stopImpersonatingUser = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .handler(({ context }) => auth.api.stopImpersonating({ headers: context.requestHeaders }))

export const stopImpersonatingUserMutation = mutationOptions({
  mutationFn: async (_variables: void, { client }) => {
    await settleQueries(client)
    return stopImpersonatingUser()
  },
  mutationKey: USER_MUTATION_KEYS.STOP_IMPERSONATING,
})
