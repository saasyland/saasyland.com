import type { QueryClient } from "@tanstack/react-query"

import { getCustomersQuery } from "~/src/modules/order/use-cases/get-customers"
import { revenueQuery } from "~/src/modules/order/use-cases/get-revenue"
import { userOrdersQuery } from "~/src/modules/order/use-cases/get-user-orders"

import { TIME_BUCKET } from "~/src/lib/time-series"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"

export const seedPaymentsQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(revenueQuery().queryKey, { bucket: TIME_BUCKET.DAY, currencies: [] })
  queryClient.setQueryData(getCustomersQuery.queryKey, { rows: [], total: 0 })
  queryClient.setQueryData(userOrdersQuery({ userId: adminUser().id }).queryKey, { orders: [], revenue: [] })
}
