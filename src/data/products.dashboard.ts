import { useSuspenseQuery } from "@tanstack/react-query"
import { Package } from "lucide-react"

import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"

import { type AdminDashboardStat, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { ROUTES } from "~/src/routes"

const AREA = "products"

export const PRODUCTS_DASHBOARD = [
  {
    area: AREA,
    icon: Package,
    key: "totalProducts",
    order: 20,
    placement: DASHBOARD_PLACEMENT.STAT,
    prefetch: (queryClient) => queryClient.query({ ...getProductsQuery, staleTime: "static" }),
    to: ROUTES.ADMIN_PRODUCTS,
    useValue: () => useSuspenseQuery(getProductsQuery).data.total,
  },
] as const satisfies readonly AdminDashboardStat[]
