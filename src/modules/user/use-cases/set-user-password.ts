import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["set-password"] })])
  .validator((input: User["setUserPassword"]) => userZodSchemas.setUserPassword.parse(input))
  .handler(({ context, data }) => auth.api.setUserPassword({ body: data, headers: context.requestHeaders }))

export const setUserPasswordMutation = mutationOptions({
  mutationFn: (data: User["setUserPassword"]) => setUserPassword({ data }),
  mutationKey: USER_MUTATION_KEYS.SET_PASSWORD,
})
