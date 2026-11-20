import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import * as AREA_PURCHASE_EMAIL from "~/src/data/purchase-email.entries"

export interface PurchaseEmailLine {
  readonly link: string
  readonly pathname: string
  readonly text: string
}

export interface PurchaseEmailContext {
  readonly locale: SupportedLocale
  readonly userId: string
}

export interface PurchaseEmailStep {
  readonly key: string
  readonly line: (context: PurchaseEmailContext) => Promise<PurchaseEmailLine | undefined>
}

const AREAS: Readonly<Record<string, readonly PurchaseEmailStep[]>> = AREA_PURCHASE_EMAIL

export const PURCHASE_EMAIL_STEPS = Object.values(AREAS).flat()
