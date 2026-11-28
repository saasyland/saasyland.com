import { POLAR_PRODUCT_STATUS, type PolarProductStatus } from "~/src/integrations/polar/polar.constants"

import type { BadgeVariant } from "~/src/presentation/components/shadcn/badge"

export const POLAR_PRODUCT_COLUMN_SIZES = {
  licenseKeys: 168,
  polar: 232,
  prices: 216,
  product: 288,
  revenue: 240,
  sales: 160,
  status: 144,
} as const

export const POLAR_PRODUCT_STATUS_BADGES: Record<PolarProductStatus, BadgeVariant> = {
  [POLAR_PRODUCT_STATUS.ARCHIVED]: "destructive",
  [POLAR_PRODUCT_STATUS.DRAFT]: "warning",
  [POLAR_PRODUCT_STATUS.PRIVATE]: "neutral",
  [POLAR_PRODUCT_STATUS.PUBLIC]: "accent",
}
