import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const confirmAccountDeletion = createServerFn({ method: "POST" })
  .middleware([withRateLimit("confirm-account-deletion", RATE_LIMITS.TOKEN), authorized()])
  .validator((input: User["confirmAccountDeletion"]) => userZodSchemas.confirmAccountDeletion.parse(input))
  .handler(({ context, data }) => auth.api.deleteUser({ body: data, headers: context.requestHeaders }))

export const confirmAccountDeletionMutation = mutationOptions({
  mutationFn: (data: User["confirmAccountDeletion"]) => confirmAccountDeletion({ data }),
  mutationKey: USER_MUTATION_KEYS.CONFIRM_ACCOUNT_DELETION,
})
