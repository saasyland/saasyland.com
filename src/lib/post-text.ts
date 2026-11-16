import { createFormatter, createTranslator } from "use-intl"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { TIER_PRICES } from "~/src/data/marketing"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

const TEXT_KEY = "text"

export const postTextValues = (locale: string): Readonly<Record<string, number | string>> => {
  const format = createFormatter({ locale })

  return {
    ...REPOSITORY_FACTS,
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
