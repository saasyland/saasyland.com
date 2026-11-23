import zod from "zod/v4"

import { CURRENCY_CODES } from "~/src/modules/_core/constants/currency"
import { choiceOf, paginationSchema, searchTextField, sortingOf } from "~/src/modules/_core/utils/pagination"
import { MIN_FIELD_LENGTH, dateRangeField, idField, numberRangeField } from "~/src/modules/_core/utils/zod-fields"
import {
  BILLING_CYCLE_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_SORT_COLUMNS,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
} from "~/src/modules/product/product.constants"

const productStatusSchema = zod.enum(PRODUCT_STATUSES)
const productTypeSchema = zod.enum(PRODUCT_TYPES)
const currencySchema = zod.enum(CURRENCY_CODES)

const productIdInput = zod.object({
  productId: idField,
})

const createProduct = zod.object({
  billingCycle: zod.string().max(BILLING_CYCLE_MAX_LENGTH).optional(),
  currency: currencySchema.optional(),
  description: zod.string().optional(),
  name: zod.string().min(MIN_FIELD_LENGTH, { message: "nameRequired" }).max(PRODUCT_NAME_MAX_LENGTH, { message: "nameMaxLength" }),
  priceCents: zod.number().int().min(0, { message: "priceCentsMin" }),
  status: productStatusSchema.optional(),
  type: productTypeSchema,
})

const deleteProduct = productIdInput

const getProduct = productIdInput

const productFilters = zod.object({
  createdAt: dateRangeField.optional(),
  pricing: numberRangeField.optional(),
  product: searchTextField.optional(),
  status: zod.array(choiceOf(PRODUCT_STATUSES)).max(PRODUCT_STATUSES.length).optional(),
  type: zod.array(choiceOf(PRODUCT_TYPES)).max(PRODUCT_TYPES.length).optional(),
  updatedAt: dateRangeField.optional(),
})

const getProducts = paginationSchema.extend({
  filters: productFilters.default({}),
  search: searchTextField.default(""),
  sorting: sortingOf(PRODUCT_SORT_COLUMNS),
  status: productStatusSchema.optional(),
  type: productTypeSchema.optional(),
})

const updateProduct = createProduct
  .partial()
  .extend({
    billingCycle: createProduct.shape.billingCycle.nullable(),
    productId: idField,
  })
  .refine(({ productId: _productId, ...fields }) => Object.values(fields).some((value) => value !== undefined), {
    message: "atLeastOneFieldRequired",
  })

export const productZodSchemas = {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
}
