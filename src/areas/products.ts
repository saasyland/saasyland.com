import { useSuspenseQuery } from "@tanstack/react-query"
import { Package } from "lucide-react"

import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"

import type { BrowserArea } from "~/src/areas/browser"
import { DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import * as ROUTES from "~/src/routes"

export const PRODUCTS_BROWSER = {
  dashboard: [
    {
      icon: Package,
      key: "totalProducts",
      order: 20,
      placement: DASHBOARD_PLACEMENT.STAT,
      prefetch: (queryClient) => queryClient.query({ ...getProductsQuery, staleTime: "static" }),
      to: ROUTES.ADMIN_PRODUCTS,
      useValue: () => useSuspenseQuery(getProductsQuery).data.total,
    },
  ],
  name: "products",
} as const satisfies BrowserArea
