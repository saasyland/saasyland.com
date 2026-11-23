import type { JSX } from "react"

import { Button, Heading, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { EMAIL_LINK_LIFETIME_HOURS } from "~/src/integrations/better-auth/auth.constants"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.delete-account-email.json"
import { APP_NAME } from "~/src/presentation/branding"
import { EmailBrandHeader } from "~/src/presentation/emails/email-brand-header"
import { EmailFallbackLink } from "~/src/presentation/emails/email-fallback-link"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const DELETE_ACCOUNT_EMAIL_NAMESPACE = "emails.delete-account-email"

interface DeleteAccountEmailProps {
  readonly confirmUrl: string
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly name: string
}

export const DeleteAccountEmail = ({ confirmUrl, locale, messages, name }: Readonly<DeleteAccountEmailProps>): JSX.Element => {
  const t = createTranslator({
    locale,
    messages: { emails: { "delete-account-email": messages } },
    namespace: "emails.delete-account-email",
  })

  return (
    <EmailLayout lang={locale} preview={t("preview", { appName: APP_NAME })}>
      <EmailBrandHeader />
      <Section>
        <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
        <Text className="m-0 mb-4 text-base text-neutral-600">{t("body", { appName: APP_NAME, name })}</Text>
        <Text className="m-0 mb-6 text-base text-neutral-600">{t("consequences")}</Text>
        <Button href={confirmUrl} className="box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline">
          {t("button")}
        </Button>
        <Text className="mt-6 mb-0 text-base text-neutral-600">{t("expiry", { hours: EMAIL_LINK_LIFETIME_HOURS })}</Text>
        <EmailFallbackLink label={t("fallback")} url={confirmUrl} />
        <Text className="mt-6 text-sm text-neutral-500">{t("footer")}</Text>
      </Section>
    </EmailLayout>
  )
}
