import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { orderRow } from "~/src/modules/order/__test__/fixtures/order"

export const ADMIN_ID = "01900000-0000-7000-8000-000000000041"
export const BUYER_ID = "01900000-0000-7000-8000-000000000042"
export const OTHER_BUYER_ID = "01900000-0000-7000-8000-000000000043"
export const CORE_PRODUCT_ID = "00000000-0000-4000-8000-0000000000c1"
export const AGENCY_PRODUCT_ID = "00000000-0000-4000-8000-0000000000a1"

export const ORDER_USERS = [
  { email: "admin@example.test", id: ADMIN_ID, name: "Admin", role: ROLE_CODES.ADMIN },
  {
    createdAt: new Date("2026-01-05T08:00:00.000Z"),
    email: "ada@example.test",
    emailVerified: true,
    id: BUYER_ID,
    name: "Ada Buyer",
    role: ROLE_CODES.CUSTOMER,
  },
  {
    createdAt: new Date("2026-03-05T08:00:00.000Z"),
    email: "grace@example.test",
    emailVerified: false,
    id: OTHER_BUYER_ID,
    name: "Grace Buyer",
    role: ROLE_CODES.CUSTOMER,
  },
]

export const PAID_CORE = orderRow({
  customerId: "cus_ada",
  description: "Core",
  id: "ord_paid_core",
  placedAt: new Date("2026-11-19T09:00:00.000Z"),
  productId: CORE_PRODUCT_ID,
  totalAmount: 19_900,
  userId: BUYER_ID,
})

export const PARTLY_REFUNDED_AGENCY = orderRow({
  currency: "eur",
  customerId: "cus_ada",
  description: "Agency",
  id: "ord_partly_refunded_agency",
  placedAt: new Date("2026-10-01T09:00:00.000Z"),
  productId: AGENCY_PRODUCT_ID,
  refundedAmount: 20_000,
  status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
  totalAmount: 71_920,
  userId: BUYER_ID,
})

export const PENDING_CORE = orderRow({
  customerId: "cus_grace",
  description: "Core",
  id: "ord_pending_core",
  placedAt: new Date("2026-11-18T09:00:00.000Z"),
  productId: CORE_PRODUCT_ID,
  status: POLAR_ORDER_STATUS.PENDING,
  totalAmount: 19_900,
  userId: OTHER_BUYER_ID,
})

export const REFUNDED_GUEST = orderRow({
  customerId: "cus_guest",
  description: "Agency",
  id: "ord_refunded_guest",
  placedAt: new Date("2025-06-01T09:00:00.000Z"),
  productId: AGENCY_PRODUCT_ID,
  refundedAmount: 49_900,
  status: POLAR_ORDER_STATUS.REFUNDED,
  totalAmount: 49_900,
})

export const ORDERS = [PAID_CORE, PARTLY_REFUNDED_AGENCY, PENDING_CORE, REFUNDED_GUEST]
