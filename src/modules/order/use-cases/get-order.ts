import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_QUERY_KEYS, POLAR_READ } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"
import { accountId, billingCountryOf, moneyOf, orderDiscountOf, polarOrderUrl } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { user } from "~/src/modules/user/user.schema"

const readPolarOrder = async (orderId: string) => {
  try {
    const live = await polar.orders.get(orderId)
    const invoice = live.is_invoice_generated ? await polar.orders.invoice(orderId) : undefined
    const money = (minorUnits: number) => moneyOf(minorUnits, live.currency)

    return {
      amounts: {
        discount: money(live.discount_amount),
        net: money(live.net_amount),
        refunded: money(live.refunded_amount),
        refundedTax: money(live.refunded_tax_amount),
        subtotal: money(live.subtotal_amount),
        tax: money(live.tax_amount),
        total: money(live.total_amount),
      },
      billingCountry: billingCountryOf(live.billing_address?.country),
      billingName: live.billing_name,
      customerEmail: live.customer.email,
      customerName: live.customer.name,
      discountCode: live.discount?.code,
      discountName: live.discount?.name,
      invoiceUrl: invoice?.url,
      orderStatus: live.status,
      read: POLAR_READ.AVAILABLE,
    }
  } catch {
    return { read: POLAR_READ.UNAVAILABLE }
  }
}

export const getOrder = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .validator((input: Order["getOrder"]) => orderZodSchemas.getOrder.parse(input))
  .handler(async ({ data: { orderId } }) => {
    const [row] = await db
      .select({
        billingCountry: order.billingCountry,
        changedAt: order.changedAt,
        currency: order.currency,
        customerId: order.customerId,
        description: order.description,
        discountAmount: order.discountAmount,
        discountCode: order.discountCode,
        discountId: order.discountId,
        discountName: order.discountName,
        id: order.id,
        invoiceNumber: order.invoiceNumber,
        placedAt: order.placedAt,
        productId: order.productId,
        refundedAmount: order.refundedAmount,
        status: order.status,
        subscriptionId: order.subscriptionId,
        totalAmount: order.totalAmount,
        user: { email: user.email, id: accountId, name: user.name },
      })
      .from(order)
      .leftJoin(user, eq(order.userId, user.id))
      .where(eq(order.id, orderId))
      .limit(1)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const { billingCountry, currency, discountAmount, discountCode, discountId, discountName, refundedAmount, totalAmount, ...mirror } = row

    return {
      order: {
        ...mirror,
        billingCountry: billingCountryOf(billingCountry),
        discount: orderDiscountOf({ currency, discountAmount, discountCode, discountId, discountName }),
        refunded: moneyOf(refundedAmount, currency),
        termsCopied: discountAmount !== null,
        total: moneyOf(totalAmount, currency),
      },
      polar: await readPolarOrder(orderId),
      polarUrl: polarOrderUrl(orderId),
    }
  })

export const getOrderQuery = (input: Order["getOrder"]) =>
  queryOptions({
    queryFn: () => getOrder({ data: input }),
    queryKey: [...ORDER_QUERY_KEYS.DETAIL, input],
  })
