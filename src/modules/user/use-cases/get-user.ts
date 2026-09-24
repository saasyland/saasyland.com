import { createServerFn } from "@tanstack/react-start"
import type zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { userZodSchemas } from "~/src/modules/user/user.zod"

export const getUser = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["get"] })])
  .validator((input: zod.input<typeof userZodSchemas.getUser.shape.userId>) => userZodSchemas.getUser.shape.userId.parse(input))
  .handler(({ context, data: userId }) => auth.api.getUser({ headers: context.requestHeaders, query: { id: userId } }))
