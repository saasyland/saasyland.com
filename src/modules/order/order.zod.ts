import * as zod from "zod"

import {
  MAX_FILTER_VALUES,
  choiceOf,
  flagFilterField,
  paginationSchema,
  searchTextField,
  sortingOf,
} from "~/src/modules/_core/utils/pagination"
import { searchSchema } from "~/src/modules/_core/utils/search"
import { countryCodeField, dateRangeField, idField, numberRangeField } from "~/src/modules/_core/utils/zod-fields"
import { CUSTOMER_SORT_COLUMNS, ORDER_SORT_COLUMNS, ORDER_STATUSES } from "~/src/modules/order/order.constants"

import { COUNTRY_CODES } from "~/src/data/countries"

import { timeRangeSchema } from "~/src/lib/time-series"

const orderFilters = zod.object({
  country: zod.array(countryCodeField).max(COUNTRY_CODES.length).optional(),
  customer: searchTextField.optional(),
  discount: idField.optional(),
  placedAt: dateRangeField.optional(),
  product: zod.array(idField).max(MAX_FILTER_VALUES).optional(),
  status: zod.array(choiceOf(ORDER_STATUSES)).max(ORDER_STATUSES.length).optional(),
  totalAmount: numberRangeField.optional(),
})

const customerFilters = zod.object({
  customer: searchTextField.optional(),
  emailVerified: flagFilterField.optional(),
  lastOrderAt: dateRangeField.optional(),
  orders: numberRangeField.optional(),
  signedUpAt: dateRangeField.optional(),
})

const getOrders = paginationSchema.extend({
  filters: orderFilters.default({}),
  search: searchTextField.default(""),
  sorting: sortingOf(ORDER_SORT_COLUMNS),
})

const getCustomers = paginationSchema.extend({
  filters: customerFilters.default({}),
  search: searchTextField.default(""),
  sorting: sortingOf(CUSTOMER_SORT_COLUMNS),
})

const getOrder = zod.object({ orderId: idField })

const getRevenue = timeRangeSchema

const getUserOrders = zod.object({ userId: idField })

const searchOrders = searchSchema

export const orderZodSchemas = {
  getCustomers,
  getOrder,
  getOrders,
  getRevenue,
  getUserOrders,
  searchOrders,
}
