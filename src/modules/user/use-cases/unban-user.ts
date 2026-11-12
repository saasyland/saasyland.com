import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const unbanUser = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["ban"] })])
  .validator((input: User["unbanUser"]) => userZodSchemas.unbanUser.parse(input))
  .handler(async ({ context, data }) => {
    const result = await auth.api.unbanUser({ body: data, headers: context.requestHeaders })

    return result
  })

export const unbanUserMutation = mutationOptions({
  mutationFn: (data: User["unbanUser"]) => unbanUser({ data }),
  mutationKey: USER_MUTATION_KEYS.UNBAN,
})
