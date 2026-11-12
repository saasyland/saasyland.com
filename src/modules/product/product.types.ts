import type * as zod from "zod"

import type { product } from "~/src/modules/product/product.schema"
import type { productZodSchemas } from "~/src/modules/product/product.zod"

export interface Product {
  select: typeof product.$inferSelect
  insert: typeof product.$inferInsert
  createProduct: zod.input<typeof productZodSchemas.createProduct>
  deleteProduct: zod.input<typeof productZodSchemas.deleteProduct>
  getProduct: zod.input<typeof productZodSchemas.getProduct>
  getProducts: zod.input<typeof productZodSchemas.getProducts>
  updateProduct: zod.input<typeof productZodSchemas.updateProduct>
}
