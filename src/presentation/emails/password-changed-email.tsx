import type { JSX, ReactNode } from "react"

import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Tailwind, Text, pixelBasedPreset } from "react-email"
import { createTranslator } from "use-intl"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.password-changed-email.json"
import { APP_NAME, CONTACT_EMAIL } from "~/src/presentation/branding"
import { EmailBrandHeader } from "~/src/presentation/emails/email-brand-header"
import { EmailFallbackLink } from "~/src/presentation/emails/email-fallback-link"

export const PASSWORD_CHANGED_EMAIL_NAMESPACE = "emails.password-changed-email"

const TAILWIND_CONFIG = { presets: [pixelBasedPreset] }

const linkTo =
  (href: string) =>
  (chunks: ReactNode): JSX.Element => (
    <Link className="text-neutral-900 underline" href={href}>
      {chunks}
    </Link>
  )

interface PasswordChangedEmailProps {
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly name: string
  readonly resetPasswordUrl: string
  readonly signInUrl: string
}

export const PasswordChangedEmail = ({
  locale,
  messages,
  name,
  resetPasswordUrl,
  signInUrl,
}: Readonly<PasswordChangedEmailProps>): JSX.Element => {
  const t = createTranslator({
    locale,
    messages: { emails: { "password-changed-email": messages } },
    namespace: "emails.password-changed-email",
  })

  return (
    <Html lang={locale}>
      <Tailwind config={TAILWIND_CONFIG}>
        <Head />
        <Body className="font-sans">
          <Preview>{t("preview", { appName: APP_NAME })}</Preview>
          <Container className="mx-auto px-5 py-10">
            <EmailBrandHeader />
            <Section>
              <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
              <Text className="m-0 mb-6 text-base text-neutral-600">{t("body", { appName: APP_NAME, name })}</Text>
              <Button
                href={signInUrl}
                className="box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline"
              >
                {t("button")}
              </Button>
              <EmailFallbackLink label={t("fallback")} url={signInUrl} />
              <Text className="mt-6 mb-0 text-base text-neutral-600">
                {t.rich("warning", { email: CONTACT_EMAIL, mail: linkTo(`mailto:${CONTACT_EMAIL}`), reset: linkTo(resetPasswordUrl) })}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
