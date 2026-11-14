import type { JSX } from "react"

import { useFormatter } from "use-intl/react"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import type { LicenseTier } from "~/src/modules/license/license.schema"

import { TIER_PRICES } from "~/src/data/marketing"

export const TierPrice = ({ tier }: { readonly tier: LicenseTier }): JSX.Element => {
  const format = useFormatter()

  return <>{format.number(TIER_PRICES[tier], CURRENCY_FORMAT)}</>
}
