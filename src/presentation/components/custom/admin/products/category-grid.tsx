import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { CATEGORY_KIND, type CATEGORY_KINDS } from "~/src/modules/category/category.constants"
import { categoryZodSchemas } from "~/src/modules/category/category.zod"
import { getCategoriesPageQuery } from "~/src/modules/category/use-cases/get-categories"

import { useCategoryColumns } from "~/src/presentation/components/custom/admin/products/category-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

type CategoryKind = (typeof CATEGORY_KINDS)[number]

const CATEGORY_GRIDS = {
  [CATEGORY_KIND.CATEGORY]: { id: "categories", messages: "categories.table" },
  [CATEGORY_KIND.COLLECTION]: { id: "collections", messages: "collections.table" },
} as const satisfies Record<CategoryKind, { readonly id: string; readonly messages: string }>

export const CategoryGrid = ({ kind, label }: { readonly kind: CategoryKind; readonly label: string }): JSX.Element => {
  const t = useTranslations("pages.admin.products")
  const columns = useCategoryColumns(kind)
  const { id, messages } = CATEGORY_GRIDS[kind]

  return (
    <DataGrid
      columns={columns}
      empty={t(`${messages}.empty`)}
      id={id}
      label={label}
      query={(request) => getCategoriesPageQuery(categoryZodSchemas.getCategories.parse({ ...request, kind }))}
      search={t(`${messages}.search`)}
    />
  )
}
