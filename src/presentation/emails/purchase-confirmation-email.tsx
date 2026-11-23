import type { JSX, ReactNode } from "react"

import { Button, CodeInline, Heading, Hr, Link, Section, Text } from "react-email"
import { createFormatter, createTranslator } from "use-intl"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { CLI_SETUP_LINES } from "~/src/data/cli"
import type { CurrencyCode } from "~/src/data/currencies"
import { REFUND_TERMS } from "~/src/data/refunds"

import type emailMessages from "~/messages/en-US/emails.purchase-confirmation-email.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { EmailBrandHeader } from "~/src/presentation/emails/email-brand-header"
import { EmailFallbackLink } from "~/src/presentation/emails/email-fallback-link"
import { EMAIL_DATE_TIME_FORMAT, EmailLayout } from "~/src/presentation/emails/email-layout"

export const PURCHASE_CONFIRMATION_EMAIL_NAMESPACE = "emails.purchase-confirmation-email"

const PARAGRAPH_CLASSNAME = "m-0 mb-4 text-base text-neutral-600"

const linkTo =
  (href: string) =>
  (chunks: ReactNode): JSX.Element => (
    <Link className="text-neutral-900 underline" href={href}>
      {chunks}
    </Link>
  )

const MAIL_TAGS = { mail: linkTo(`mailto:${CONTACT_EMAIL}`) }

export interface PurchaseConfirmationLinks {
  readonly account: string
  readonly docs: string
  readonly licence: string
  readonly refunds: string
  readonly terms: string
  readonly withdrawal: string
}

export interface PurchaseConfirmationStep {
  readonly link: string
  readonly text: string
  readonly url: string
}

interface PurchaseConfirmationEmailProps {
  readonly amount: number
  readonly currency: CurrencyCode
  readonly links: PurchaseConfirmationLinks
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly orderedAt: Date
  readonly reference: string
  readonly refundDeadline: Date
  readonly steps: readonly PurchaseConfirmationStep[]
  readonly tierName: string
  readonly withdrawalConsent: boolean
}

export const PurchaseConfirmationEmail = ({
  amount,
  currency,
  links,
  locale,
  messages,
  orderedAt,
  reference,
  refundDeadline,
  steps,
  tierName,
  withdrawalConsent,
}: Readonly<PurchaseConfirmationEmailProps>): JSX.Element => {
  const format = createFormatter({ formats: I18N.FORMATS, locale, timeZone: I18N.DEFAULT_TIMEZONE })
  const t = createTranslator({
    locale,
    messages: { emails: { "purchase-confirmation-email": messages } },
    namespace: "emails.purchase-confirmation-email",
  })

  const date = format.dateTime(orderedAt, "calendarDate")
  const days = REFUND_TERMS.WITHDRAWAL_DAYS

  return (
    <EmailLayout lang={locale} preview={t("heading", { tier: tierName })}>
      <EmailBrandHeader />
      <Section>
        <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading", { tier: tierName })}</Heading>
        <Text className={PARAGRAPH_CLASSNAME}>{t("intro")}</Text>
        <Text className={PARAGRAPH_CLASSNAME}>
          {t("details", { amount: format.number(amount, { currency, style: "currency" }), date, reference, tier: tierName })}
        </Text>
      </Section>
      <Section className="my-6 rounded-lg border border-solid border-neutral-200 px-5 py-4">
        <Heading as="h2" className="m-0 mb-3 text-lg font-bold text-neutral-900">
          {t("getStarted.title")}
        </Heading>
        <Text className={PARAGRAPH_CLASSNAME}>{t("getStarted.key")}</Text>
        <Button
          className="box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline"
          href={links.account}
        >
          {t("getStarted.button")}
        </Button>
        <EmailFallbackLink label={t("getStarted.fallback")} url={links.account} />
        {CLI_SETUP_LINES.map(({ command, id }) => (
          <Text className="m-0 mt-4 text-base text-neutral-600" key={id}>
            {t(`getStarted.${id}`, { days })}
            <br />
            <CodeInline className="rounded-sm bg-neutral-100 px-1.5 py-0.5 font-mono text-sm text-neutral-900">{command}</CodeInline>
          </Text>
        ))}
        <Text className="m-0 mt-4 text-base text-neutral-600">{t.rich("getStarted.docs", { docs: linkTo(links.docs) })}</Text>
        {steps.map(({ link, text, url }) => (
          <Text className="m-0 mt-4 text-base text-neutral-600" key={url}>
            {text}{" "}
            <Link className="text-neutral-900 underline" href={url}>
              {link}
            </Link>
          </Text>
        ))}
      </Section>
      <Section>
        {withdrawalConsent && <Text className={PARAGRAPH_CLASSNAME}>{t("withdrawal.waived", { days })}</Text>}
        {!withdrawalConsent && (
          <Text className={PARAGRAPH_CLASSNAME}>
            {t.rich("withdrawal.open", { ...MAIL_TAGS, days, email: CONTACT_EMAIL, withdrawal: linkTo(links.withdrawal) })}
          </Text>
        )}
        <Text className={PARAGRAPH_CLASSNAME}>
          {t.rich("refund", {
            ...MAIL_TAGS,
            deadline: format.dateTime(refundDeadline, EMAIL_DATE_TIME_FORMAT),
            email: CONTACT_EMAIL,
            withdrawal: linkTo(links.withdrawal),
          })}
        </Text>
        <Hr className="my-6 border-neutral-200" />
        <Text className="m-0 text-sm text-neutral-500">
          {t.rich("terms", { date, licence: linkTo(links.licence), refunds: linkTo(links.refunds), terms: linkTo(links.terms) })}
        </Text>
      </Section>
    </EmailLayout>
  )
}
