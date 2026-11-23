import type { CurrencyCode } from "~/src/data/currencies"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

export const AFFILIATE_PROGRAM: FeatureStatus = FEATURE_STATUS.ARRIVING

export const AFFILIATE_TERMS = {
  COMMISSION_PERCENT: 30,
  COOKIE_DAYS: 60,
  HOLD_DAYS: 60,
  MINIMUM_PAYOUT: 50,
  PAYOUT_CURRENCY: "USD" satisfies CurrencyCode,
} as const

export const AFFILIATE_PORTAL_URL = "https://saasyland.affonso.io"
