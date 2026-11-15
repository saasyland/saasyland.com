import type { AreaRows } from "~/src/integrations/drizzle-orm/__test__/rows"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { category } from "~/src/modules/category/category.schema"
import { product } from "~/src/modules/product/product.schema"

export const PRODUCTS_ROWS = [
  {
    insert: () => [
      db.insert(category).values({ id: "schema-category", name: "Category" }).returning(),
      db.insert(product).values({ id: "schema-product", name: "Product" }).returning(),
    ],
  },
] as const satisfies readonly AreaRows[]
