import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import type { Session } from "~/src/modules/session/session.types"
import { sessionZodSchemas } from "~/src/modules/session/session.zod"

export const listUserSessions = createServerFn({ method: "GET" })
  .middleware([authorized({ session: ["list"] })])
  .validator((input: Session["listUserSessions"]) => sessionZodSchemas.listUserSessions.parse(input))
  .handler(async ({ context, data }) => {
    const { sessions } = await auth.api.listUserSessions({ body: data, headers: context.requestHeaders })

    return sessions
      .map(({ token: _token, ...session }) => session)
      .toSorted((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
  })

export const listUserSessionsQuery = (data: Session["listUserSessions"]) =>
  queryOptions({
    queryFn: () => listUserSessions({ data }),
    queryKey: [...SESSION_QUERY_KEYS.USER, data],
  })
