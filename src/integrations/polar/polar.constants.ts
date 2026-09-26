import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

export const POLAR_PRODUCT_IDS = {
  agency: env.POLAR_PRODUCT_ID_AGENCY,
  complete: env.POLAR_PRODUCT_ID_COMPLETE,
  core: env.POLAR_PRODUCT_ID_CORE,
} as const

export const POLAR_CHECKOUT_PRODUCTS = Object.entries(POLAR_PRODUCT_IDS).map(([slug, productId]) => ({ productId, slug }))
