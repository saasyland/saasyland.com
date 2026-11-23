import type { JSX, ReactNode } from "react"

import { Button, Heading, Link, Section, Text } from "react-email"
import { createFormatter, createTranslator } from "use-intl"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { OAUTH_PROVIDERS } from "~/src/data/auth"

import type emailMessages from "~/messages/en-US/emails.existing-account-email.json"
import { APP_NAME } from "~/src/presentation/branding"
import { EmailBrandHeader } from "~/src/presentation/emails/email-brand-header"
import { EmailFallbackLink } from "~/src/presentation/emails/email-fallback-link"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const EXISTING_ACCOUNT_EMAIL_NAMESPACE = "emails.existing-account-email"

const PARAGRAPH_CLASSNAME = "m-0 mb-6 text-base text-neutral-600"

interface ExistingAccountEmailProps {
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly name: string
  readonly providers: readonly string[]
  readonly resetPasswordUrl: string
  readonly signInUrl: string
}

export const ExistingAccountEmail = ({
  locale,
  messages,
  name,
  providers,
  resetPasswordUrl,
  signInUrl,
}: Readonly<ExistingAccountEmailProps>): JSX.Element => {
  const format = createFormatter({ locale })
  const t = createTranslator({
    locale,
    messages: { emails: { "existing-account-email": messages } },
    namespace: "emails.existing-account-email",
  })

  const methods = [
    ...providers.filter((provider) => provider === AUTH_PROVIDER.CREDENTIAL).map(() => t("credentialMethod")),
    ...OAUTH_PROVIDERS.filter(({ id }) => providers.includes(id)).map((provider) => provider.name),
  ]

  const resetLink = (chunks: ReactNode): JSX.Element => (
    <Link className="text-neutral-900 underline" href={resetPasswordUrl}>
      {chunks}
    </Link>
  )

  return (
    <EmailLayout lang={locale} preview={t("preview", { appName: APP_NAME })}>
      <EmailBrandHeader />
      <Section>
        <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading", { appName: APP_NAME })}</Heading>
        <Text className={PARAGRAPH_CLASSNAME}>{t("body", { appName: APP_NAME, name })}</Text>
        {methods.length > 0 && (
          <Text className={PARAGRAPH_CLASSNAME}>{t("methods", { methods: format.list(methods, { type: "disjunction" }) })}</Text>
        )}
        <Button href={signInUrl} className="box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline">
          {t("button")}
        </Button>
        <EmailFallbackLink label={t("fallback")} url={signInUrl} />
        <Text className="mt-6 mb-0 text-base text-neutral-600">{t.rich("resetPassword", { link: resetLink })}</Text>
        <Text className="mt-6 text-sm text-neutral-500">{t("footer")}</Text>
      </Section>
    </EmailLayout>
  )
}
