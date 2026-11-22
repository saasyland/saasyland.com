import type { UserTab } from "~/src/data/user-tabs"

import { AdminCustomersPending } from "~/src/presentation/components/custom/admin/payments-pending"

import { ROUTES } from "~/src/routes"

const AREA = "payments"

export const PAYMENTS_USER_TABS = [
  { area: AREA, key: "customers", order: 20, pendingComponent: AdminCustomersPending, to: ROUTES.ADMIN_USERS_CUSTOMERS },
] as const satisfies readonly UserTab[]
