import type * as zod from "zod"

import type { product } from "~/src/modules/product/product.schema"
import type { productZodSchemas } from "~/src/modules/product/product.zod"
import type { getProducts } from "~/src/modules/product/use-cases/get-products"

export interface Product {
  select: typeof product.$inferSelect
  insert: typeof product.$inferInsert
  listedProduct: Awaited<ReturnType<typeof getProducts>>["rows"][number]
  createProduct: zod.input<typeof productZodSchemas.createProduct>
  deleteProduct: zod.input<typeof productZodSchemas.deleteProduct>
  getProduct: zod.input<typeof productZodSchemas.getProduct>
  getProducts: zod.input<typeof productZodSchemas.getProducts>
  productList: zod.output<typeof productZodSchemas.getProducts>
  updateProduct: zod.input<typeof productZodSchemas.updateProduct>
}
