import type { JSX } from "react"

import { Heading, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.newsletter-notification-email.json"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const NEWSLETTER_NOTIFICATION_NAMESPACE = "emails.newsletter-notification-email"

interface NewsletterNotificationEmailProps {
  readonly email: string
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly subscriberLocale: SupportedLocale
}

export const NewsletterNotificationEmail = ({
  email,
  locale,
  messages,
  subscriberLocale,
}: Readonly<NewsletterNotificationEmailProps>): JSX.Element => {
  const t = createTranslator({
    locale,
    messages: { emails: { "newsletter-notification-email": messages } },
    namespace: "emails.newsletter-notification-email",
  })

  return (
    <EmailLayout lang={locale} preview={t("preview")}>
      <Section>
        <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
        <Text className="m-0 text-base text-neutral-600">{t("body", { email, locale: subscriberLocale })}</Text>
      </Section>
    </EmailLayout>
  )
}
