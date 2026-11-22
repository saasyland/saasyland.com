import { userOrdersQuery } from "~/src/modules/order/use-cases/get-user-orders"

import type { UserProfileSection } from "~/src/data/user-profile"

import { UserOrdersPending } from "~/src/presentation/components/custom/admin/payments-pending"
import { UserOrders } from "~/src/presentation/components/custom/admin/payments/user-orders"

export const PAYMENTS_USER_PROFILE = [
  {
    Pending: UserOrdersPending,
    Section: UserOrders,
    key: "orders",
    load: ({ queryClient, userId }) => queryClient.query(userOrdersQuery({ userId })),
  },
] as const satisfies readonly UserProfileSection[]
