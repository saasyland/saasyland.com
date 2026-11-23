import type { JSX } from "react"

import { Button, Heading, Text } from "react-email"
import { createTranslator } from "use-intl"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.newsletter-confirmation-email.json"
import { APP_DOMAIN, CONTACT_EMAIL } from "~/src/presentation/branding"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const NEWSLETTER_CONFIRMATION_NAMESPACE = "emails.newsletter-confirmation-email"

interface NewsletterConfirmationEmailProps {
  readonly confirmUrl: string
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
}

export const NewsletterConfirmationEmail = ({ messages, confirmUrl, locale }: Readonly<NewsletterConfirmationEmailProps>): JSX.Element => {
  const t = createTranslator({
    locale,
    messages: { emails: { "newsletter-confirmation-email": messages } },
    namespace: "emails.newsletter-confirmation-email",
  })

  return (
    <EmailLayout lang={locale} preview={t("preview")}>
      <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
      <Text className="m-0 mb-6 text-base text-neutral-600">{t("body", { appDomain: APP_DOMAIN })}</Text>
      <Button href={confirmUrl} className="box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline">
        {t("button")}
      </Button>
      <Text className="mt-6 text-sm text-neutral-500">{t("footer")}</Text>
      <Text className="m-0 text-sm text-neutral-500">
        <a className="text-neutral-500 underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </Text>
    </EmailLayout>
  )
}
