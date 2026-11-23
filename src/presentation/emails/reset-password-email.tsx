import type { JSX } from "react"

import { Button, Heading, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { EMAIL_LINK_LIFETIME_HOURS } from "~/src/integrations/better-auth/auth.constants"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.reset-password-email.json"
import { APP_NAME } from "~/src/presentation/branding"
import { EmailBrandHeader } from "~/src/presentation/emails/email-brand-header"
import { EmailFallbackLink } from "~/src/presentation/emails/email-fallback-link"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const RESET_PASSWORD_NAMESPACE = "emails.reset-password-email"

interface ResetPasswordEmailProps {
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly name: string
  readonly resetPasswordUrl: string
}

export const ResetPasswordEmail = ({ messages, locale, name, resetPasswordUrl }: Readonly<ResetPasswordEmailProps>): JSX.Element => {
  const t = createTranslator({
    locale,
    messages: { emails: { "reset-password-email": messages } },
    namespace: "emails.reset-password-email",
  })

  return (
    <EmailLayout lang={locale} preview={t("preview", { appName: APP_NAME })}>
      <EmailBrandHeader />
      <Section>
        <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
        <Text className="m-0 mb-6 text-base text-neutral-600">{t("body", { name })}</Text>
        <Button
          href={resetPasswordUrl}
          className="box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline"
        >
          {t("button")}
        </Button>
        <Text className="mt-6 mb-0 text-base text-neutral-600">{t("expiry", { hours: EMAIL_LINK_LIFETIME_HOURS })}</Text>
        <EmailFallbackLink label={t("fallback")} url={resetPasswordUrl} />
        <Text className="mt-6 text-sm text-neutral-500">{t("footer")}</Text>
      </Section>
    </EmailLayout>
  )
}
