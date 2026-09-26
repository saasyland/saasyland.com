import type { JSX } from "react"

import { Body, Button, Container, Head, Heading, Html, Preview, Section, Tailwind, Text, pixelBasedPreset } from "react-email"
import { createTranslator } from "use-intl"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.verify-email.json"

export const VERIFY_EMAIL_NAMESPACE = "emails.verify-email"

const TAILWIND_CONFIG = { presets: [pixelBasedPreset] }

interface VerifyEmailProps {
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly name: string
  readonly verifyUrl: string
}

export const VerifyEmail = ({ messages, locale, name, verifyUrl }: Readonly<VerifyEmailProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "verify-email": messages } }, namespace: "emails.verify-email" })

  return (
    <Html lang={locale}>
      <Tailwind config={TAILWIND_CONFIG}>
        <Head />
        <Body className="font-sans">
          <Preview>{t("preview")}</Preview>
          <Container className="mx-auto px-5 py-10">
            <Section>
              <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
              <Text className="m-0 mb-6 text-base text-neutral-600">{t("body", { name })}</Text>
              <Button
                href={verifyUrl}
                className="box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline"
              >
                {t("button")}
              </Button>
              <Text className="mt-6 text-sm text-neutral-500">{t("footer")}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
