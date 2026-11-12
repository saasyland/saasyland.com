import type * as zod from "zod"

import type { category } from "~/src/modules/category/category.schema"
import type { categoryZodSchemas } from "~/src/modules/category/category.zod"

export interface Category {
  select: typeof category.$inferSelect
  insert: typeof category.$inferInsert
  createCategory: zod.input<typeof categoryZodSchemas.createCategory>
  deleteCategory: zod.input<typeof categoryZodSchemas.deleteCategory>
  getCategories: zod.input<typeof categoryZodSchemas.getCategories>
  getCategory: zod.input<typeof categoryZodSchemas.getCategory>
  updateCategory: zod.input<typeof categoryZodSchemas.updateCategory>
}
