import zod from "zod/v4"

import { paginationSchema } from "~/src/modules/_core/utils/pagination"
import { TIME_RANGES, timeRangeSchema } from "~/src/modules/_core/utils/time-series"
import { idField } from "~/src/modules/_core/utils/zod-fields"
import {
  CUSTOMER_SORT_COLUMNS,
  ORDER_SEARCH_MAX_LENGTH,
  ORDER_SORT_COLUMNS,
  ORDER_SORT_COLUMNS_MAX,
  ORDER_STATUSES,
} from "~/src/modules/order/order.constants"

const searchField = zod.string().trim().max(ORDER_SEARCH_MAX_LENGTH)

const choiceOf = <const Choice extends string>(choices: readonly [Choice, ...Choice[]]) => zod.string().pipe(zod.enum(choices))

const sortingOf = <const Column extends string>(columns: readonly [Column, ...Column[]]) => {
  const sort = zod.object({ desc: zod.boolean(), id: choiceOf(columns) })

  return zod.array(sort).max(ORDER_SORT_COLUMNS_MAX).default([])
}

const orderFilters = zod.object({
  customer: searchField.optional(),
  placedAt: choiceOf(TIME_RANGES).optional(),
  product: idField.optional(),
  status: choiceOf(ORDER_STATUSES).optional(),
})

const customerFilters = zod.object({ customer: searchField.optional() })

const getOrders = paginationSchema.extend({ filters: orderFilters.default({}), sorting: sortingOf(ORDER_SORT_COLUMNS) })

const getCustomers = paginationSchema.extend({ filters: customerFilters.default({}), sorting: sortingOf(CUSTOMER_SORT_COLUMNS) })

const getOrder = zod.object({ orderId: idField })

const getRevenue = timeRangeSchema

const getUserOrders = zod.object({ userId: idField })

export const orderZodSchemas = {
  getCustomers,
  getOrder,
  getOrders,
  getRevenue,
  getUserOrders,
}
