import { createFormatter, createTranslator } from "use-intl"

import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { AFFILIATE_PROGRAM, AFFILIATE_TERMS } from "~/src/data/affiliates"
import { CLI_GENERATION_VALUES } from "~/src/data/cli"
import { BILLING_GENERATION, TIER_PRICES } from "~/src/data/marketing"
import { CURRENCY_FORMAT } from "~/src/data/pricing"
import { REFUND_TERMS } from "~/src/data/refunds"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

const TEXT_KEY = "text"

export const postTextValues = (locale: string): Readonly<Record<string, number | string>> => {
  const format = createFormatter({ locale })

  return {
    ...REPOSITORY_FACTS,
    ...CLI_GENERATION_VALUES,
    affiliateHoldDays: AFFILIATE_TERMS.HOLD_DAYS,
    affiliateProgram: AFFILIATE_PROGRAM,
    billingGeneration: BILLING_GENERATION,
    refundWithdrawalDays: REFUND_TERMS.WITHDRAWAL_DAYS,
    ...Object.fromEntries<number | string>(
      LICENSE_TIERS.flatMap((tier) => [
        [`${tier}Machines`, LICENSE_ACTIVATION_LIMITS[tier]],
        [`${tier}Price`, format.number(TIER_PRICES[tier], CURRENCY_FORMAT)],
      ]),
    ),
  }
}

export const formatPostText = ({ locale, text }: Readonly<{ locale: string; text: string }>): string =>
  createTranslator({ locale, messages: { [TEXT_KEY]: text } })(TEXT_KEY, postTextValues(locale))
