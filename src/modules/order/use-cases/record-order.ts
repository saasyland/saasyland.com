import "@tanstack/react-start/server-only"

import type { models } from "@polar-sh/sdk/2026-10"
import { lte } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polarCustomerAccount } from "~/src/integrations/polar/polar.customers"

import { order } from "~/src/modules/order/order.schema"

export const recordOrder = async (polarOrder: models.Order): Promise<void> => {
  const copy = {
    changedAt: new Date(polarOrder.modified_at ?? polarOrder.created_at),
    currency: polarOrder.currency,
    customerId: polarOrder.customer_id,
    description: polarOrder.description,
    invoiceNumber: polarOrder.invoice_number,
    placedAt: new Date(polarOrder.created_at),
    productId: polarOrder.product_id,
    refundedAmount: polarOrder.refunded_amount,
    status: polarOrder.status,
    subscriptionId: polarOrder.subscription_id,
    totalAmount: polarOrder.total_amount,
    userId: polarCustomerAccount(polarOrder.customer),
  }

  await db
    .insert(order)
    .values({ id: polarOrder.id, ...copy })
    .onConflictDoUpdate({ set: copy, setWhere: lte(order.changedAt, copy.changedAt), target: order.id })
}
