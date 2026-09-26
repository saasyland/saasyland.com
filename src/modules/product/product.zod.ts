import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { CURRENCY_CODES } from "~/src/modules/_core/constants/currency"
import { MIN_FIELD_LENGTH, idField } from "~/src/modules/_core/utils/zod-fields"
import { PRODUCT_STATUSES, PRODUCT_TYPES, product } from "~/src/modules/product/product.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({ zodInstance: zod })

export const PRODUCT_NAME_MAX_LENGTH = 255

const BILLING_CYCLE_MAX_LENGTH = 32

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

const updateProduct = createProduct
  .partial()
  .extend({
    billingCycle: createProduct.shape.billingCycle.nullable(),
    productId: idField,
  })
  .refine(({ productId: _productId, ...fields }) => Object.values(fields).some((value) => value !== undefined), {
    message: "atLeastOneFieldRequired",
  })

const insert = createInsertSchema(product)
const select = createSelectSchema(product)
const update = createUpdateSchema(product)

export const productZodSchemas = {
  createProduct,
  deleteProduct,
  getProduct,
  insert,
  select,
  update,
  updateProduct,
}
