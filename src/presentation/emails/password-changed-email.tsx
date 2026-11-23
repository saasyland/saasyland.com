import type { JSX, ReactNode } from "react"

import { Button, Heading, Link, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.password-changed-email.json"
import { APP_NAME, CONTACT_EMAIL } from "~/src/presentation/branding"
import { EmailBrandHeader } from "~/src/presentation/emails/email-brand-header"
import { EmailFallbackLink } from "~/src/presentation/emails/email-fallback-link"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const PASSWORD_CHANGED_EMAIL_NAMESPACE = "emails.password-changed-email"

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
    <EmailLayout lang={locale} preview={t("preview", { appName: APP_NAME })}>
      <EmailBrandHeader />
      <Section>
        <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
        <Text className="m-0 mb-6 text-base text-neutral-600">{t("body", { appName: APP_NAME, name })}</Text>
        <Button href={signInUrl} className="box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline">
          {t("button")}
        </Button>
        <EmailFallbackLink label={t("fallback")} url={signInUrl} />
        <Text className="mt-6 mb-0 text-base text-neutral-600">
          {t.rich("warning", { email: CONTACT_EMAIL, mail: linkTo(`mailto:${CONTACT_EMAIL}`), reset: linkTo(resetPasswordUrl) })}
        </Text>
      </Section>
    </EmailLayout>
  )
}
