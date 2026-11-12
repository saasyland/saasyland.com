import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["delete"] })])
  .validator((input: User["deleteUser"]) => userZodSchemas.deleteUser.parse(input))
  .handler(async ({ context, data }) => {
    const result = await auth.api.removeUser({ body: data, headers: context.requestHeaders })

    return result
  })

export const deleteUserMutation = mutationOptions({
  mutationFn: (data: User["deleteUser"]) => deleteUser({ data }),
  mutationKey: USER_MUTATION_KEYS.DELETE,
})
