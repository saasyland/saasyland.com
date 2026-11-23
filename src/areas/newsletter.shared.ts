import type { SharedArea } from "./shared.ts"

export const NEWSLETTER = "/newsletter"
export const NEWSLETTER_CONFIRM = "/newsletter/confirm"
export const NEWSLETTER_UNSUBSCRIBE = "/newsletter/unsubscribe"

export const NEWSLETTER_SHARED = { unlisted: [NEWSLETTER] } as const satisfies SharedArea
