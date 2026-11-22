import zod from "zod/v4"

import { COUNTRY_CODES } from "~/src/modules/_core/constants/country"
import { MAX_FILTER_VALUES, MAX_SORTED_COLUMNS, SEARCH_MAX_LENGTH, paginationSchema } from "~/src/modules/_core/utils/pagination"
import { timeRangeSchema } from "~/src/modules/_core/utils/time-series"
import { countryCodeField, dateRangeField, idField, numberRangeField } from "~/src/modules/_core/utils/zod-fields"
import { CUSTOMER_SORT_COLUMNS, ORDER_SORT_COLUMNS, ORDER_STATUSES } from "~/src/modules/order/order.constants"

const searchField = zod.string().trim().max(SEARCH_MAX_LENGTH)

const choiceOf = <const Choice extends string>(choices: readonly [Choice, ...Choice[]]) => zod.string().pipe(zod.enum(choices))

const sortingOf = <const Column extends string>(columns: readonly [Column, ...Column[]]) => {
  const sort = zod.object({ desc: zod.boolean(), id: choiceOf(columns) })

  return zod.array(sort).max(MAX_SORTED_COLUMNS).default([])
}

const orderFilters = zod.object({
  country: zod.array(countryCodeField).max(COUNTRY_CODES.length).optional(),
  customer: searchField.optional(),
  discount: idField.optional(),
  placedAt: dateRangeField.optional(),
  product: zod.array(idField).max(MAX_FILTER_VALUES).optional(),
  status: zod.array(choiceOf(ORDER_STATUSES)).max(ORDER_STATUSES.length).optional(),
  totalAmount: numberRangeField.optional(),
})

const customerFilters = zod.object({ customer: searchField.optional() })

const getOrders = paginationSchema.extend({
  filters: orderFilters.default({}),
  search: searchField.default(""),
  sorting: sortingOf(ORDER_SORT_COLUMNS),
})

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
