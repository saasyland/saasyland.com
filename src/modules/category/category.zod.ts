import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { MIN_FIELD_LENGTH, idField } from "~/src/modules/_core/utils/zod-fields"
import { CATEGORY_ICONS, CATEGORY_KINDS, CATEGORY_VISIBILITIES, category } from "~/src/modules/category/category.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({ zodInstance: zod })

export const CATEGORY_NAME_MAX_LENGTH = 255

const categoryIconSchema = zod.enum(CATEGORY_ICONS)
const categoryKindSchema = zod.enum(CATEGORY_KINDS)
const categoryVisibilitySchema = zod.enum(CATEGORY_VISIBILITIES)

const categoryIdInput = zod.object({
  categoryId: idField,
})

const createCategory = zod.object({
  description: zod.string().optional(),
  icon: categoryIconSchema.optional(),
  kind: categoryKindSchema,
  name: zod.string().min(MIN_FIELD_LENGTH, { message: "nameRequired" }).max(CATEGORY_NAME_MAX_LENGTH, { message: "nameMaxLength" }),
  visibility: categoryVisibilitySchema.optional(),
})

const deleteCategory = categoryIdInput

const getCategory = categoryIdInput

const updateCategory = createCategory
  .partial()
  .extend({
    categoryId: idField,
  })
  .refine(({ categoryId: _categoryId, ...fields }) => Object.values(fields).some((value) => value !== undefined), {
    message: "atLeastOneFieldRequired",
  })

const insert = createInsertSchema(category)
const select = createSelectSchema(category)
const update = createUpdateSchema(category)

export const categoryZodSchemas = {
  createCategory,
  deleteCategory,
  getCategory,
  insert,
  select,
  update,
  updateCategory,
}
