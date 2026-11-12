import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const getUser = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["get"] })])
  .validator((input: User["getUser"]) => userZodSchemas.getUser.parse(input))
  .handler(({ context, data: { userId } }) => auth.api.getUser({ headers: context.requestHeaders, query: { id: userId } }))
