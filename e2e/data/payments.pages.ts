import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { TEST_BUYER_ORDERS } from "./payments"
import type { PageEntry } from "./pages"

const [paidOrder] = TEST_BUYER_ORDERS

export const PAYMENTS_PAGES = [
  { path: "/admin/orders", role: ROLE_CODES.ADMIN },
  { path: `/admin/orders/${paidOrder.id}`, role: ROLE_CODES.ADMIN },
  { path: "/admin/users/customers", role: ROLE_CODES.ADMIN },
] as const satisfies readonly PageEntry[]
