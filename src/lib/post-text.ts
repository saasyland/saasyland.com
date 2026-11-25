import { createFormatter, createTranslator } from "use-intl"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { AFFILIATE_PROGRAM, AFFILIATE_TERMS } from "~/src/data/affiliates"
import { CLI_GENERATION_VALUES } from "~/src/data/cli"
import { TIER_PRICES, TIER_SUPPORT_VALUES } from "~/src/data/license"
import { BILLING_GENERATION } from "~/src/data/marketing"
import { REFUND_TERMS } from "~/src/data/refunds"

import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"

const TEXT_KEY = "text"

const POST_TEXT_VALUES: Readonly<Record<string, number | string>> = {
  ...REPOSITORY_FACTS,
  ...CLI_GENERATION_VALUES,
  ...TIER_SUPPORT_VALUES,
  affiliateHoldDays: AFFILIATE_TERMS.HOLD_DAYS,
  affiliateProgram: AFFILIATE_PROGRAM,
  billingGeneration: BILLING_GENERATION,
  refundWithdrawalDays: REFUND_TERMS.WITHDRAWAL_DAYS,
  ...Object.fromEntries(LICENSE_TIERS.map((tier) => [`${tier}Machines`, LICENSE_ACTIVATION_LIMITS[tier]])),
}

interface PostText {
  readonly locale: string
  readonly text: string
  readonly values?: Readonly<Record<string, string>>
}

export const formatPostText = ({ locale, text, values }: PostText): string => {
  const format = createFormatter({ locale })

  return createTranslator({ locale, messages: { [TEXT_KEY]: text } })(TEXT_KEY, {
    ...POST_TEXT_VALUES,
    ...Object.fromEntries(LICENSE_TIERS.map((tier) => [`${tier}Price`, format.number(TIER_PRICES[tier], CURRENCY_FORMAT)])),
    ...values,
  })
}
