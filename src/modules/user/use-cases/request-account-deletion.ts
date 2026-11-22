import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([withRateLimit("request-account-deletion", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: User["requestAccountDeletion"]) => userZodSchemas.requestAccountDeletion.parse(input))
  .handler(({ context, data }) => auth.api.deleteUser({ body: data, headers: context.requestHeaders }))

export const requestAccountDeletionMutation = mutationOptions({
  mutationFn: (data: User["requestAccountDeletion"]) => requestAccountDeletion({ data }),
  mutationKey: USER_MUTATION_KEYS.REQUEST_ACCOUNT_DELETION,
})
