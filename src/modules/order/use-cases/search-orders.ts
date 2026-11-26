import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { desc, eq, or } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { containsText } from "~/src/integrations/drizzle-orm/drizzle.search"

import { SEARCH_HITS_LIMIT, SEARCH_STALE_MS, type SearchHit } from "~/src/modules/_core/utils/search"
import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { user } from "~/src/modules/user/user.schema"

import { ROUTES } from "~/src/routes"

const DETAIL_SEPARATOR = " · "

export const searchOrders = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .validator((input: Order["searchOrders"]) => orderZodSchemas.searchOrders.parse(input))
  .handler(async ({ data }): Promise<readonly SearchHit[]> => {
    const rows = await db
      .select({ customerId: order.customerId, description: order.description, email: user.email, id: order.id, name: user.name })
      .from(order)
      .leftJoin(user, eq(order.userId, user.id))
      .where(
        or(
          containsText(order.id, data.text),
          containsText(order.customerId, data.text),
          containsText(user.name, data.text),
          containsText(user.email, data.text),
        ),
      )
      .orderBy(desc(order.placedAt), desc(order.id))
      .limit(SEARCH_HITS_LIMIT)
    return rows.map(({ customerId, description, email, id, name }) => ({
      detail: [id, description].join(DETAIL_SEPARATOR),
      id,
      title: name ?? email ?? customerId,
      to: `${ROUTES.ADMIN.ORDERS}/${id}`,
    }))
  })

export const searchOrdersQuery = (input: Order["searchOrders"]) =>
  queryOptions({
    enabled: orderZodSchemas.searchOrders.safeParse(input).success,
    placeholderData: keepPreviousData,
    queryFn: () => searchOrders({ data: input }),
    queryKey: [...ORDER_QUERY_KEYS.SEARCH, input.text],
    staleTime: SEARCH_STALE_MS,
  })
