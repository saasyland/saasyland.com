import type { JSX } from "react"

import type { models } from "@polar-sh/sdk/2026-10"
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Tailwind, Text, pixelBasedPreset } from "react-email"
import { createFormatter, createTranslator } from "use-intl"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type { CurrencyCode } from "~/src/modules/_core/constants/currency"

import type emailMessages from "~/messages/en-US/emails.unmatched-order-alert-email.json"

export const UNMATCHED_ORDER_ALERT_EMAIL_NAMESPACE = "emails.unmatched-order-alert-email"

const TAILWIND_CONFIG = { presets: [pixelBasedPreset] }

const PARAGRAPH_CLASSNAME = "m-0 mb-4 text-base text-neutral-600"

const ORDERED_AT_FORMAT = { ...I18N.FORMATS.dateTime.calendarDate, ...I18N.FORMATS.dateTime.time }

const DETAILS = ["order", "date", "tier", "amount", "email", "name"] as const

type Detail = (typeof DETAILS)[number]

interface UnmatchedOrderAlertEmailProps {
  readonly amount: number
  readonly currency: CurrencyCode
  readonly customer: Pick<models.OrderCustomer, "email" | "name">
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly orderId: string
  readonly orderedAt: Date
  readonly polarUrl: string
  readonly tierName: string
}

export const UnmatchedOrderAlertEmail = ({
  amount,
  currency,
  customer,
  locale,
  messages,
  orderId,
  orderedAt,
  polarUrl,
  tierName,
}: Readonly<UnmatchedOrderAlertEmailProps>): JSX.Element => {
  const format = createFormatter({ formats: I18N.FORMATS, locale, timeZone: I18N.DEFAULT_TIMEZONE })
  const t = createTranslator({
    locale,
    messages: { emails: { "unmatched-order-alert-email": messages } },
    namespace: "emails.unmatched-order-alert-email",
  })

  const values: Record<Detail, string> = {
    amount: format.number(amount, { currency, style: "currency" }),
    date: format.dateTime(orderedAt, ORDERED_AT_FORMAT),
    email: customer.email ?? t("notGiven"),
    name: customer.name ?? t("notGiven"),
    order: orderId,
    tier: tierName,
  }

  return (
    <Html lang={locale}>
      <Tailwind config={TAILWIND_CONFIG}>
        <Head />
        <Body className="font-sans">
          <Preview>{t("preview", { tier: tierName })}</Preview>
          <Container className="mx-auto px-5 py-10">
            <Section>
              <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
              <Text className={PARAGRAPH_CLASSNAME}>{t("intro", { tier: tierName })}</Text>
              {DETAILS.map((detail) => (
                <Text className="m-0 mb-3 text-base text-neutral-900" key={detail}>
                  <span className="block text-sm text-neutral-500">{t(`details.${detail}`)}</span>
                  {values[detail]}
                </Text>
              ))}
              <Button
                className="mt-3 box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline"
                href={polarUrl}
              >
                {t("open")}
              </Button>
              <Text className="mt-6 text-sm text-neutral-500">{t("recovery")}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
