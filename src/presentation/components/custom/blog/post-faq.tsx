import type { JSX } from "react"

import { Accordion, Accordions } from "@fumadocs/base-ui/components/accordion"
import { useLocale } from "use-intl/react"

import { formatPostText } from "~/src/lib/post-text"

type FaqEntries = readonly { readonly answer: string; readonly question: string }[] | undefined

export const usePostFaq = (entries: FaqEntries): { answer: string; question: string }[] => {
  const locale = useLocale()

  return (entries ?? []).map(({ answer, question }) => ({
    answer: formatPostText({ locale, text: answer }),
    question: formatPostText({ locale, text: question }),
  }))
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
