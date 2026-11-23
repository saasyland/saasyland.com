import { lazyRouteComponent } from "@tanstack/react-router"
import { ReceiptText } from "lucide-react"

import { revenueQuery } from "~/src/modules/order/use-cases/get-revenue"
import { userOrdersQuery } from "~/src/modules/order/use-cases/get-user-orders"
import { searchOrdersQuery } from "~/src/modules/order/use-cases/search-orders"

import type { BrowserArea } from "~/src/areas/browser"
import { DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { UserOrdersPending } from "~/src/presentation/components/custom/admin/payments-pending"
import { RevenueChartPending } from "~/src/presentation/components/custom/admin/payments/revenue-chart-pending"

import * as ROUTES from "~/src/routes"

export const PAYMENTS_BROWSER = {
  commandSearches: [
    { icon: ReceiptText, key: "orders", order: 20, permission: { order: ["read"] }, query: ({ text }) => searchOrdersQuery({ text }) },
  ],
  dashboard: [
    {
      Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/payments/revenue-chart"), "RevenueChart"),
      Pending: RevenueChartPending,
      key: "revenue",
      order: 10,
      placement: DASHBOARD_PLACEMENT.PANEL,
      prefetch: (queryClient) => queryClient.query({ ...revenueQuery(), staleTime: "static" }),
    },
  ],
  layoutNamespaces: [{ layout: "/admin/users", namespaces: ["pages.admin.customers", "pages.admin.orders"] }],
  name: "payments",
  userProfile: [
    {
      Pending: UserOrdersPending,
      Section: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/payments/user-orders"), "UserOrders"),
      key: "orders",
      load: ({ queryClient, userId }) => queryClient.query(userOrdersQuery({ userId })),
    },
  ],
  userTabs: [{ key: "customers", order: 20, to: ROUTES.ADMIN_USERS_CUSTOMERS }],
} as const satisfies BrowserArea
