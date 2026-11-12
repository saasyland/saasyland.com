import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const updateUser = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["update"] })])
  .validator((input: User["updateUser"]) => userZodSchemas.updateUser.parse(input))
  .handler(({ context, data: input }) => {
    const { userId, ...data } = input

    return auth.api.adminUpdateUser({
      body: { data, userId },
      headers: context.requestHeaders,
    })
  })

export const updateUserMutation = mutationOptions({
  mutationFn: (data: User["updateUser"]) => updateUser({ data }),
  mutationKey: USER_MUTATION_KEYS.UPDATE,
})
