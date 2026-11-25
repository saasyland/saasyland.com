import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_INVOICE_STATUS, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import type { Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const getCurrentOrderInvoice = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: Order["getCurrentOrderInvoice"]) => orderZodSchemas.getCurrentOrderInvoice.parse(input))
  .handler(async ({ context, data: { orderId } }) => {
    const [owned] = await db
      .select({ id: order.id })
      .from(order)
      .where(and(eq(order.id, orderId), eq(order.userId, context.auth.user.id)))
      .limit(1)

    if (owned === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const { is_invoice_generated: isInvoiceGenerated } = await polar.orders.get(orderId)

    if (!isInvoiceGenerated) {
      return { status: ORDER_INVOICE_STATUS.PENDING } as const
    }

    const { url } = await polar.orders.invoice(orderId)

    return { status: ORDER_INVOICE_STATUS.ISSUED, url } as const
  })

export const currentOrderInvoiceQuery = (input: Order["getCurrentOrderInvoice"]) =>
  queryOptions({
    gcTime: 0,
    queryFn: () => getCurrentOrderInvoice({ data: input }),
    queryKey: [...ORDER_QUERY_KEYS.CURRENT_INVOICE, input],
  })
