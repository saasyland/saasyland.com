import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { POLAR_READ } from "~/src/modules/order/order.constants"
import type { Order } from "~/src/modules/order/order.types"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { fixtureDate } from "~/src/presentation/components/custom/admin/__test__/fixture-date"

const BUYER = adminUser()

export const adminOrderRow = (overrides: Partial<Order["listRow"]> = {}): Order["listRow"] => ({
  billingCountry: "DE",
  customerId: "cus_ada",
  description: "Complete",
  discount: undefined,
  id: "ord_complete",
  placedAt: fixtureDate,
  refunded: { amount: 0, currency: "USD" },
  status: POLAR_ORDER_STATUS.PAID,
  total: { amount: 199, currency: "USD" },
  user: { email: BUYER.email, id: BUYER.id, name: BUYER.name },
  ...overrides,
})

export const adminCustomerRow = (overrides: Partial<Order["customerRow"]> = {}): Order["customerRow"] => ({
  customerId: "cus_ada",
  id: "cus_ada",
  lastOrderAt: fixtureDate,
  orders: 2,
  revenue: [
    { amount: 519.2, currency: "EUR" },
    { amount: 199, currency: "USD" },
  ],
  user: { createdAt: fixtureDate, email: BUYER.email, emailVerified: true, id: BUYER.id, name: BUYER.name },
  ...overrides,
})

export const adminOrderDetail = (overrides: Partial<Order["detail"]["order"]> = {}): Order["detail"]["order"] => ({
  billingCountry: "DE",
  changedAt: fixtureDate,
  customerId: "cus_ada",
  description: "Complete",
  discount: { amount: { amount: 49.75, currency: "USD" }, code: "LAUNCH", id: "dsc_launch", name: "Launch week" },
  id: "ord_complete",
  invoiceNumber: "SAASY-0001",
  placedAt: fixtureDate,
  productId: "prod_complete",
  refunded: { amount: 0, currency: "USD" },
  status: POLAR_ORDER_STATUS.PAID,
  subscriptionId: null,
  termsCopied: true,
  total: { amount: 199, currency: "USD" },
  user: { email: BUYER.email, id: BUYER.id, name: BUYER.name },
  ...overrides,
})

export const adminPolarOrder = (overrides: Partial<Order["polarOrder"]> = {}): Order["polarOrder"] => ({
  amounts: {
    discount: { amount: 49.75, currency: "USD" },
    net: { amount: 199, currency: "USD" },
    refunded: { amount: 10, currency: "USD" },
    refundedTax: { amount: 1.6, currency: "USD" },
    subtotal: { amount: 248.75, currency: "USD" },
    tax: { amount: 37.81, currency: "USD" },
    total: { amount: 236.81, currency: "USD" },
  },
  billingCountry: "DE",
  billingName: "Ada GmbH",
  customerEmail: BUYER.email,
  customerName: BUYER.name,
  discountCode: "LAUNCH",
  discountName: "Launch week",
  invoiceUrl: "https://sandbox.polar.sh/invoices/ord_complete.pdf",
  orderStatus: POLAR_ORDER_STATUS.PAID,
  read: POLAR_READ.AVAILABLE,
  ...overrides,
})
