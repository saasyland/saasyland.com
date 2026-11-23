import type { JSX } from "react"

import { Button, Heading, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import type { Role } from "~/src/integrations/better-auth/auth.roles"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { INVITATION_LIFETIME_DAYS } from "~/src/modules/invitation/invitation.constants"

import type emailMessages from "~/messages/en-US/emails.invitation-email.json"
import { APP_NAME } from "~/src/presentation/branding"
import { EmailBrandHeader } from "~/src/presentation/emails/email-brand-header"
import { EmailFallbackLink } from "~/src/presentation/emails/email-fallback-link"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const INVITATION_EMAIL_NAMESPACE = "emails.invitation-email"

interface InvitationEmailProps {
  readonly acceptUrl: string
  readonly inviter: string
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly role: Role
}

export const InvitationEmail = ({ acceptUrl, inviter, locale, messages, role }: Readonly<InvitationEmailProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "invitation-email": messages } }, namespace: "emails.invitation-email" })

  return (
    <EmailLayout lang={locale} preview={t("preview", { appName: APP_NAME, inviter })}>
      <EmailBrandHeader />
      <Section>
        <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading", { appName: APP_NAME })}</Heading>
        <Text className="m-0 mb-6 text-base text-neutral-600">{t("body", { appName: APP_NAME, inviter, role: t(`roles.${role}`) })}</Text>
        <Button href={acceptUrl} className="box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline">
          {t("button")}
        </Button>
        <Text className="mt-6 mb-0 text-base text-neutral-600">{t("expiry", { days: INVITATION_LIFETIME_DAYS })}</Text>
        <EmailFallbackLink label={t("fallback")} url={acceptUrl} />
        <Text className="mt-6 text-sm text-neutral-500">{t("footer")}</Text>
      </Section>
    </EmailLayout>
  )
}
