import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"

export const POLAR_PRODUCT_IDS = {
  [LICENSE_TIER.AGENCY]: env.POLAR_PRODUCT_ID_AGENCY,
  [LICENSE_TIER.COMPLETE]: env.POLAR_PRODUCT_ID_COMPLETE,
  [LICENSE_TIER.CORE]: env.POLAR_PRODUCT_ID_CORE,
} as const

export const POLAR_ORDER_STATUS = {
  PAID: "paid",
  PARTIALLY_REFUNDED: "partially_refunded",
  REFUNDED: "refunded",
} as const satisfies Record<string, models.OrderStatus>

export const POLAR_CHECKOUT_PRODUCTS = Object.entries(POLAR_PRODUCT_IDS).map(([slug, productId]) => ({ productId, slug }))
