import type { CurrencyCode } from "~/src/data/currencies"

export const DEFAULT_CURRENCY_CODE: CurrencyCode = "USD"

export const CURRENCY_FORMAT = {
  currency: DEFAULT_CURRENCY_CODE,
  style: "currency",
  trailingZeroDisplay: "stripIfInteger",
} as const
