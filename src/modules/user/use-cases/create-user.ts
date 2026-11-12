import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const createUser = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["create"] })])
  .validator((input: User["createUser"]) => userZodSchemas.createUser.parse(input))
  .handler(({ context, data }) => auth.api.createUser({ body: data, headers: context.requestHeaders }))

export const createUserMutation = mutationOptions({
  mutationFn: (data: User["createUser"]) => createUser({ data }),
  mutationKey: USER_MUTATION_KEYS.CREATE,
})
