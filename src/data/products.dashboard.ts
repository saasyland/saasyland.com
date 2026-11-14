import { useSuspenseQuery } from "@tanstack/react-query"

import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"

import type { AdminDashboardStat } from "~/src/data/dashboard"

export const PRODUCTS_DASHBOARD = [
  {
    key: "totalProducts",
    order: 20,
    prefetch: (queryClient) => queryClient.query({ ...getProductsQuery, staleTime: "static" }),
    useValue: () => useSuspenseQuery(getProductsQuery).data.total,
  },
] as const satisfies readonly AdminDashboardStat[]
