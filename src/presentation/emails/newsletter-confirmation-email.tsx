import type { JSX } from "react"

import { Body, Button, Container, Head, Heading, Html, Preview, Tailwind, Text, pixelBasedPreset } from "react-email"
import { createTranslator } from "use-intl"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.newsletter-confirmation-email.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"

export const NEWSLETTER_CONFIRMATION_NAMESPACE = "emails.newsletter-confirmation-email"

const TAILWIND_CONFIG = { presets: [pixelBasedPreset] }

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
    <Html lang={locale}>
      <Tailwind config={TAILWIND_CONFIG}>
        <Head />
        <Body className="font-sans">
          <Preview>{t("preview")}</Preview>
          <Container className="mx-auto px-5 py-10">
            <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
            <Text className="m-0 mb-6 text-base text-neutral-600">{t("body")}</Text>
            <Button
              href={confirmUrl}
              className="box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline"
            >
              {t("button")}
            </Button>
            <Text className="mt-6 text-sm text-neutral-500">{t("footer")}</Text>
            <Text className="m-0 text-sm text-neutral-500">
              <a className="text-neutral-500 underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
