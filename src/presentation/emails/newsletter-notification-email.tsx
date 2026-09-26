import type { JSX } from "react"

import { Body, Container, Head, Heading, Html, Preview, Section, Tailwind, Text, pixelBasedPreset } from "react-email"
import { createTranslator } from "use-intl"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.newsletter-notification-email.json"

export const NEWSLETTER_NOTIFICATION_NAMESPACE = "emails.newsletter-notification-email"

const TAILWIND_CONFIG = { presets: [pixelBasedPreset] }

interface NewsletterNotificationEmailProps {
  readonly email: string
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
}

export const NewsletterNotificationEmail = ({ messages, email, locale }: Readonly<NewsletterNotificationEmailProps>): JSX.Element => {
  const t = createTranslator({
    locale: I18N.DEFAULT_LOCALE,
    messages: { emails: { "newsletter-notification-email": messages } },
    namespace: "emails.newsletter-notification-email",
  })

  return (
    <Html lang={I18N.DEFAULT_LOCALE}>
      <Tailwind config={TAILWIND_CONFIG}>
        <Head />
        <Body className="font-sans">
          <Preview>{t("preview")}</Preview>
          <Container className="mx-auto px-5 py-10">
            <Section>
              <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
              <Text className="m-0 text-base text-neutral-600">{t("body", { email, locale })}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
