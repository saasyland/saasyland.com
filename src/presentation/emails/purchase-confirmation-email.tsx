import type { JSX, ReactNode } from "react"

import { Body, Container, Head, Heading, Html, Link, Preview, Section, Tailwind, Text, pixelBasedPreset } from "react-email"
import { createFormatter, createTranslator } from "use-intl"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type { CurrencyCode } from "~/src/modules/_core/constants/currency"

import { REFUND_TERMS } from "~/src/data/refunds"

import type emailMessages from "~/messages/en-US/emails.purchase-confirmation-email.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"

export const PURCHASE_CONFIRMATION_EMAIL_NAMESPACE = "emails.purchase-confirmation-email"

const TAILWIND_CONFIG = { presets: [pixelBasedPreset] }

const PARAGRAPH_CLASSNAME = "m-0 mb-4 text-base text-neutral-600"

const DEADLINE_FORMAT = { ...I18N.FORMATS.dateTime.calendarDate, ...I18N.FORMATS.dateTime.time }

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
  readonly licence: string
  readonly refunds: string
  readonly terms: string
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
    <Html lang={locale}>
      <Tailwind config={TAILWIND_CONFIG}>
        <Head />
        <Body className="font-sans">
          <Preview>{t("heading", { tier: tierName })}</Preview>
          <Container className="mx-auto px-5 py-10">
            <Section>
              <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading", { tier: tierName })}</Heading>
              <Text className={PARAGRAPH_CLASSNAME}>{t("intro")}</Text>
              <Text className={PARAGRAPH_CLASSNAME}>
                {t("details", { amount: format.number(amount, { currency, style: "currency" }), date, reference, tier: tierName })}
              </Text>
              {withdrawalConsent && <Text className={PARAGRAPH_CLASSNAME}>{t("withdrawal.waived", { days })}</Text>}
              {!withdrawalConsent && (
                <Text className={PARAGRAPH_CLASSNAME}>{t.rich("withdrawal.open", { ...MAIL_TAGS, days, email: CONTACT_EMAIL })}</Text>
              )}
              <Text className={PARAGRAPH_CLASSNAME}>
                {t.rich("refund", { ...MAIL_TAGS, deadline: format.dateTime(refundDeadline, DEADLINE_FORMAT), email: CONTACT_EMAIL })}
              </Text>
              <Text className={PARAGRAPH_CLASSNAME}>{t.rich("key", { account: linkTo(links.account) })}</Text>
              <Text className="m-0 text-sm text-neutral-500">
                {t.rich("terms", { date, licence: linkTo(links.licence), refunds: linkTo(links.refunds), terms: linkTo(links.terms) })}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
