import type { QueryClient } from "@tanstack/react-query"

import { TIME_BUCKET } from "~/src/modules/_core/utils/time-series"
import { revenueQuery } from "~/src/modules/order/use-cases/get-revenue"

export const seedPaymentsQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(revenueQuery().queryKey, { bucket: TIME_BUCKET.DAY, currencies: [] })
}
