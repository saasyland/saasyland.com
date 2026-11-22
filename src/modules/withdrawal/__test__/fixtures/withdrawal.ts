import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { orderRow } from "~/src/modules/order/__test__/fixtures/order"
import { order } from "~/src/modules/order/order.schema"
import { user } from "~/src/modules/user/user.schema"
import { withdrawal } from "~/src/modules/withdrawal/withdrawal.schema"

export const WITHDRAWAL_USERS = {
  ADMIN: { email: "admin@example.test", id: "01900000-0000-7000-8000-000000000101", name: "Admin" },
  BUYER: { email: "Buyer@Example.test", id: "01900000-0000-7000-8000-000000000102", name: "Ada Buyer" },
  NO_CONSENT: { email: "noconsent@example.test", id: "01900000-0000-7000-8000-000000000103", name: "Grace Buyer" },
  REFUNDED: { email: "refunded@example.test", id: "01900000-0000-7000-8000-000000000104", name: "Refunded Buyer" },
  VISITOR: { email: "visitor@example.test", id: "01900000-0000-7000-8000-000000000105", name: "Visitor" },
} as const

export const WITHDRAWAL_ORDERS = {
  BUYER: { id: "8b0f5a52-2f3c-4d47-9f0e-0c6a3f6f9d21", invoiceNumber: "SAASY-0042" },
  NO_CONSENT: { id: "ord_no-consent" },
  REFUNDED: { id: "ord_refunded" },
} as const

export const WITHDRAWAL_LICENSES = {
  BUYER: "withdrawal-buyer-license",
  NO_CONSENT: "withdrawal-no-consent-license",
  REFUNDED: "withdrawal-refunded-license",
} as const

export const PURCHASED_AT = new Date("2026-11-10T09:30:00.000Z")

export const seedWithdrawalBuyers = async (): Promise<void> => {
  await db.delete(withdrawal)
  await db.delete(order)
  await db.delete(user)
  await db.insert(user).values([
    { ...WITHDRAWAL_USERS.ADMIN, role: ROLE_CODES.ADMIN },
    { ...WITHDRAWAL_USERS.BUYER, role: ROLE_CODES.CUSTOMER },
    { ...WITHDRAWAL_USERS.NO_CONSENT, role: ROLE_CODES.CUSTOMER },
    { ...WITHDRAWAL_USERS.REFUNDED, role: ROLE_CODES.CUSTOMER },
    { ...WITHDRAWAL_USERS.VISITOR, role: ROLE_CODES.CUSTOMER },
  ])
  await db.insert(license).values([
    {
      id: WITHDRAWAL_LICENSES.BUYER,
      polarCustomerId: "cus_buyer",
      polarOrderId: WITHDRAWAL_ORDERS.BUYER.id,
      purchaseCreatedAt: PURCHASED_AT,
      tier: LICENSE_TIER.COMPLETE,
      userId: WITHDRAWAL_USERS.BUYER.id,
      withdrawalConsentAt: PURCHASED_AT,
    },
    {
      id: WITHDRAWAL_LICENSES.NO_CONSENT,
      polarCustomerId: "cus_no-consent",
      polarOrderId: WITHDRAWAL_ORDERS.NO_CONSENT.id,
      purchaseCreatedAt: PURCHASED_AT,
      tier: LICENSE_TIER.CORE,
      userId: WITHDRAWAL_USERS.NO_CONSENT.id,
    },
    {
      id: WITHDRAWAL_LICENSES.REFUNDED,
      polarCustomerId: "cus_refunded",
      polarOrderId: WITHDRAWAL_ORDERS.REFUNDED.id,
      purchaseCreatedAt: PURCHASED_AT,
      status: LICENSE_STATUS.REFUNDED,
      tier: LICENSE_TIER.AGENCY,
      userId: WITHDRAWAL_USERS.REFUNDED.id,
      withdrawalConsentAt: PURCHASED_AT,
    },
  ])
  await db.insert(order).values(orderRow({ ...WITHDRAWAL_ORDERS.BUYER, placedAt: PURCHASED_AT, userId: WITHDRAWAL_USERS.BUYER.id }))
}
