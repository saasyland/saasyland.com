import type { JSX } from "react"

import { Accordion, Accordions } from "@fumadocs/base-ui/components/accordion"
import { useLocale } from "use-intl/react"

import { formatPostText } from "~/src/lib/post-text"

type FaqEntries = readonly { readonly answer: string; readonly question: string }[] | undefined

export const PostFaq = ({ entries }: Readonly<{ entries: FaqEntries }>): JSX.Element => {
  const locale = useLocale()

  return (
    <Accordions>
      {(entries ?? []).map(({ answer, question }) => (
        <Accordion key={question} title={formatPostText({ locale, text: question })}>
          <p>{formatPostText({ locale, text: answer })}</p>
        </Accordion>
      ))}
    </Accordions>
  )
}
