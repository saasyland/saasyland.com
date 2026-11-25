import type { JSX } from "react"

import { Heading, Hr, Link, Text } from "react-email"
import { createTranslator } from "use-intl"

import type { NewsletterIssueContent } from "~/src/modules/newsletter-issue/newsletter-issue.utils"

import type emailMessages from "~/messages/en-US/emails.newsletter-issue-email.json"
import { APP_DOMAIN } from "~/src/presentation/branding"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const NEWSLETTER_ISSUE_NAMESPACE = "emails.newsletter-issue-email"

interface NewsletterIssueEmailProps {
  readonly content: NewsletterIssueContent
  readonly messages: typeof emailMessages
  readonly unsubscribeUrl: string
}

export const NewsletterIssueEmail = ({ content, messages, unsubscribeUrl }: NewsletterIssueEmailProps): JSX.Element => {
  const t = createTranslator({
    locale: content.locale,
    messages: { emails: { "newsletter-issue-email": messages } },
    namespace: "emails.newsletter-issue-email",
  })

  return (
    <EmailLayout lang={content.locale} preview={content.paragraphs.at(0) ?? content.subject}>
      <Heading className="m-0 mb-6 text-2xl font-bold">{content.subject}</Heading>
      {content.paragraphs.map((paragraph, index) => (
        <Text className="m-0 mb-4 text-base whitespace-pre-line text-neutral-700" key={index}>
          {paragraph}
        </Text>
      ))}
      <Hr className="my-8 border-neutral-200" />
      <Text className="m-0 text-sm text-neutral-500">
        {t("footer", { appDomain: APP_DOMAIN })}{" "}
        <Link className="text-neutral-500 underline" href={unsubscribeUrl}>
          {t("unsubscribe")}
        </Link>
      </Text>
    </EmailLayout>
  )
}
