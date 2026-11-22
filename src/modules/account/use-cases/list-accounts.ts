import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ACCOUNT_QUERY_KEYS } from "~/src/modules/account/account.constants"

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }) => {
    const accounts = await auth.api.listUserAccounts({ headers: context.requestHeaders })

    return accounts.map(({ createdAt, id, providerId }) => ({ createdAt, id, providerId }))
  })

export const listAccountsQuery = queryOptions({ queryFn: () => listAccounts(), queryKey: ACCOUNT_QUERY_KEYS.LIST })
