import { POLAR_PRICE_TYPE, POLAR_PRODUCT_STATUSES, POLAR_RECURRING_INTERVAL } from "~/src/integrations/polar/polar.constants"

export const PRODUCTS_LABELS = [
  { keys: POLAR_PRODUCT_STATUSES, labels: "pages.admin.products.table.statusLabels" },
  { keys: Object.values(POLAR_PRICE_TYPE).filter((type) => type !== POLAR_PRICE_TYPE.FIXED), labels: "pages.admin.products.table.prices" },
  { keys: Object.values(POLAR_RECURRING_INTERVAL), labels: "pages.admin.products.table.recurrence" },
]
