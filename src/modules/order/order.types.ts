import type * as zod from "zod"

import type { order } from "~/src/modules/order/order.schema"
import type { Money } from "~/src/modules/order/order.utils"
import type { orderZodSchemas } from "~/src/modules/order/order.zod"
import type { getCurrentOrders } from "~/src/modules/order/use-cases/get-current-orders"
import type { getCustomers } from "~/src/modules/order/use-cases/get-customers"
import type { getOrder } from "~/src/modules/order/use-cases/get-order"
import type { getOrderFilters } from "~/src/modules/order/use-cases/get-order-filters"
import type { getOrders } from "~/src/modules/order/use-cases/get-orders"
import type { getProductSales } from "~/src/modules/order/use-cases/get-product-sales"
import type { getRevenue } from "~/src/modules/order/use-cases/get-revenue"
import type { getUserOrders } from "~/src/modules/order/use-cases/get-user-orders"

type OrderDetail = Awaited<ReturnType<typeof getOrder>>

export interface Order {
  select: typeof order.$inferSelect
  insert: typeof order.$inferInsert
  money: Money
  revenue: Awaited<ReturnType<typeof getRevenue>>
  currencyRevenue: Awaited<ReturnType<typeof getRevenue>>["currencies"][number]
  listRow: Awaited<ReturnType<typeof getOrders>>["rows"][number]
  customerRow: Awaited<ReturnType<typeof getCustomers>>["rows"][number]
  productSales: Awaited<ReturnType<typeof getProductSales>>["products"][number]
  detail: OrderDetail
  filterOptions: Awaited<ReturnType<typeof getOrderFilters>>
  polarOrder: Extract<OrderDetail["polar"], { amounts: unknown }>
  userOrders: Awaited<ReturnType<typeof getUserOrders>>
  currentOrders: Awaited<ReturnType<typeof getCurrentOrders>>
  currentOrder: Awaited<ReturnType<typeof getCurrentOrders>>["orders"][number]
  orderFilters: zod.output<typeof orderZodSchemas.getOrders>["filters"]
  customerFilters: zod.output<typeof orderZodSchemas.getCustomers>["filters"]
  getCurrentOrderInvoice: zod.input<typeof orderZodSchemas.getCurrentOrderInvoice>
  getCustomers: zod.input<typeof orderZodSchemas.getCustomers>
  getOrder: zod.input<typeof orderZodSchemas.getOrder>
  getOrders: zod.input<typeof orderZodSchemas.getOrders>
  getRevenue: zod.input<typeof orderZodSchemas.getRevenue>
  getUserOrders: zod.input<typeof orderZodSchemas.getUserOrders>
  searchOrders: zod.input<typeof orderZodSchemas.searchOrders>
  startCheckout: zod.input<typeof orderZodSchemas.startCheckout>
}
