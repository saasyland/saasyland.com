import { MILLISECONDS_PER_SECOND, SECONDS_PER_HOUR } from "~/src/lib/duration"

const EXPIRY_RADIX = 36

interface ExpiryGrant {
  readonly now: number
  readonly ttlSeconds: number
}

export const signedExpiry = ({ now, ttlSeconds }: ExpiryGrant): string => {
  const earliestExpiry = Math.floor(now / MILLISECONDS_PER_SECOND) + ttlSeconds

  return (Math.ceil(earliestExpiry / SECONDS_PER_HOUR) * SECONDS_PER_HOUR).toString(EXPIRY_RADIX)
}

export const isUnexpired = ({ expires, now }: { readonly expires: string; readonly now: number }): boolean =>
  Number.parseInt(expires, EXPIRY_RADIX) * MILLISECONDS_PER_SECOND > now
