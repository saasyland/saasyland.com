import type { JSX } from "react"

import { Accordion, Accordions } from "@fumadocs/base-ui/components/accordion"
import { createTranslator } from "use-intl"
import { useFormatter, useLocale } from "use-intl/react"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { TIER_PRICES } from "~/src/data/marketing"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

type FaqEntries = readonly { readonly answer: string; readonly question: string }[] | undefined

type FaqValues = Readonly<Record<string, number | string>>

const ANSWER_KEY = "answer"

export const faqValues = (formatPrice: (amount: number) => string): FaqValues => ({
  ...REPOSITORY_FACTS,
  ...Object.fromEntries<number | string>(
    LICENSE_TIERS.flatMap((tier) => [
      [`${tier}Machines`, LICENSE_ACTIVATION_LIMITS[tier]],
      [`${tier}Price`, formatPrice(TIER_PRICES[tier])],
    ]),
  ),
})

export const formatFaqAnswer = ({ answer, locale, values }: Readonly<{ answer: string; locale: string; values: FaqValues }>): string =>
  createTranslator({ locale, messages: { [ANSWER_KEY]: answer } })(ANSWER_KEY, values)

export const usePostFaq = (entries: FaqEntries): { answer: string; question: string }[] => {
  const format = useFormatter()
  const locale = useLocale()

  const values = faqValues((amount) => format.number(amount, CURRENCY_FORMAT))

  return (entries ?? []).map(({ answer, question }) => ({ answer: formatFaqAnswer({ answer, locale, values }), question }))
}

export const PostFaq = ({ entries }: Readonly<{ entries: FaqEntries }>): JSX.Element => {
  const faq = usePostFaq(entries)

  return (
    <Accordions>
      {faq.map(({ answer, question }) => (
        <Accordion key={question} title={question}>
          <p>{answer}</p>
        </Accordion>
      ))}
    </Accordions>
  )
}
