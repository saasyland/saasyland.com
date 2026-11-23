import zod from "zod/v4"

import { choiceOf, paginationSchema, searchTextField, sortingOf } from "~/src/modules/_core/utils/pagination"
import { MIN_FIELD_LENGTH, dateRangeField, idField } from "~/src/modules/_core/utils/zod-fields"
import {
  CATEGORY_ICONS,
  CATEGORY_KINDS,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_SORT_COLUMNS,
  CATEGORY_VISIBILITIES,
} from "~/src/modules/category/category.constants"

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

const categoryFilters = zod.object({
  createdAt: dateRangeField.optional(),
  name: searchTextField.optional(),
  updatedAt: dateRangeField.optional(),
  visibility: zod.array(choiceOf(CATEGORY_VISIBILITIES)).max(CATEGORY_VISIBILITIES.length).optional(),
})

const getCategories = paginationSchema.extend({
  filters: categoryFilters.default({}),
  kind: categoryKindSchema.optional(),
  search: searchTextField.default(""),
  sorting: sortingOf(CATEGORY_SORT_COLUMNS),
})

const getCategory = categoryIdInput

const updateCategory = createCategory
  .partial()
  .extend({
    categoryId: idField,
  })
  .refine(({ categoryId: _categoryId, ...fields }) => Object.values(fields).some((value) => value !== undefined), {
    message: "atLeastOneFieldRequired",
  })

export const categoryZodSchemas = {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
}
