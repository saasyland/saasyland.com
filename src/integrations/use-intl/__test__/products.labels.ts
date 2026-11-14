import { CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"
import { PRODUCT_STATUS, PRODUCT_TYPE } from "~/src/modules/product/product.constants"

export const PRODUCTS_LABELS = [
  { keys: Object.values(PRODUCT_STATUS), labels: "pages.admin.products.table.statusLabels" },
  { keys: Object.values(PRODUCT_TYPE), labels: "pages.admin.products.table.typeLabels" },
  { keys: Object.values(CATEGORY_VISIBILITY), labels: "pages.admin.products.table.visibilityLabels" },
]
