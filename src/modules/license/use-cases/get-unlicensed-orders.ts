import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, inArray, notExists } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { fromMinorUnits } from "~/src/modules/_core/constants/currency"
import { LICENSE_QUERY_KEYS } from "~/src/modules/license/license.constants"
import { license, revokedLicenseOrder } from "~/src/modules/license/license.schema"
import { POLAR_PRODUCT_IDS, orderCurrencySchema, polarOrderUrl } from "~/src/modules/license/license.utils"
import { order } from "~/src/modules/order/order.schema"

const licensed = db.select({ id: license.id }).from(license).where(eq(license.polarOrderId, order.id))

const revoked = db
  .select({ polarOrderId: revokedLicenseOrder.polarOrderId })
  .from(revokedLicenseOrder)
  .where(eq(revokedLicenseOrder.polarOrderId, order.id))

export const getUnlicensedOrders = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .handler(async () => {
    const licenseProducts = inArray(order.productId, Object.values(POLAR_PRODUCT_IDS))
    const rows = await db
      .select({
        currency: order.currency,
        customerId: order.customerId,
        id: order.id,
        placedAt: order.placedAt,
        totalAmount: order.totalAmount,
      })
      .from(order)
      .where(and(eq(order.status, POLAR_ORDER_STATUS.PAID), licenseProducts, notExists(licensed), notExists(revoked)))
      .orderBy(desc(order.placedAt), desc(order.id))

    return {
      rows: rows.map(({ currency: code, customerId, id, placedAt, totalAmount }) => {
        const currency = orderCurrencySchema.parse(code)

        return { amount: fromMinorUnits(totalAmount, currency), currency, customerId, id, placedAt, polarUrl: polarOrderUrl(id) }
      }),
    }
  })

export const unlicensedOrdersQuery = queryOptions({ queryFn: () => getUnlicensedOrders(), queryKey: LICENSE_QUERY_KEYS.UNLICENSED_ORDERS })
