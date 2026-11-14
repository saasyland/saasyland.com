import type { CurrencyCode } from "~/src/modules/_core/constants/currency"

export const AFFILIATE_TERMS = {
  COMMISSION_PERCENT: 40,
  COOKIE_DAYS: 60,
  HOLD_DAYS: 30,
  MINIMUM_PAYOUT: 50,
  PAYOUT_CURRENCY: "USD" satisfies CurrencyCode,
} as const
