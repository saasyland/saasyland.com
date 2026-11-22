import type { JSX, ReactNode } from "react"

import { Body, Container, Head, Heading, Html, Link, Preview, Section, Tailwind, Text, pixelBasedPreset } from "react-email"
import { createFormatter, createTranslator } from "use-intl"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"

import { REFUND_TERMS } from "~/src/data/refunds"

import type emailMessages from "~/messages/en-US/emails.withdrawal-acknowledgement-email.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { EmailBrandHeader } from "~/src/presentation/emails/email-brand-header"

export const WITHDRAWAL_ACKNOWLEDGEMENT_EMAIL_NAMESPACE = "emails.withdrawal-acknowledgement-email"

const TAILWIND_CONFIG = { presets: [pixelBasedPreset] }

const PARAGRAPH_CLASSNAME = "m-0 mb-4 text-base text-neutral-600"

const SUBMITTED_AT_FORMAT = { ...I18N.FORMATS.dateTime.calendarDate, ...I18N.FORMATS.dateTime.time }

const CONTENT = ["name", "reference", "email", "submittedAt"] as const

type Content = (typeof CONTENT)[number]

const MAIL_TAGS = {
  email: CONTACT_EMAIL,
  mail: (chunks: ReactNode): JSX.Element => (
    <Link className="text-neutral-900 underline" href={`mailto:${CONTACT_EMAIL}`}>
      {chunks}
    </Link>
  ),
}

interface WithdrawalAcknowledgementEmailProps {
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly statement: Pick<Withdrawal["select"], "createdAt" | "email" | "name" | "reference">
}

export const WithdrawalAcknowledgementEmail = ({
  locale,
  messages,
  statement,
}: Readonly<WithdrawalAcknowledgementEmailProps>): JSX.Element => {
  const format = createFormatter({ formats: I18N.FORMATS, locale, timeZone: I18N.DEFAULT_TIMEZONE })
  const t = createTranslator({
    locale,
    messages: { emails: { "withdrawal-acknowledgement-email": messages } },
    namespace: "emails.withdrawal-acknowledgement-email",
  })

  const submittedAt = format.dateTime(statement.createdAt, SUBMITTED_AT_FORMAT)
  const values: Record<Content, string> = {
    email: statement.email,
    name: statement.name,
    reference: statement.reference,
    submittedAt,
  }

  return (
    <Html lang={locale}>
      <Tailwind config={TAILWIND_CONFIG}>
        <Head />
        <Body className="font-sans">
          <Preview>{t("preview", { submittedAt })}</Preview>
          <Container className="mx-auto px-5 py-10">
            <EmailBrandHeader />
            <Section>
              <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
              <Text className={PARAGRAPH_CLASSNAME}>{t("intro")}</Text>
            </Section>
            <Section className="my-6 rounded-lg border border-solid border-neutral-200 px-5 py-4">
              <Heading as="h2" className="m-0 mb-3 text-lg font-bold text-neutral-900">
                {t("content.title")}
              </Heading>
              <Text className="m-0 mb-4 text-base text-neutral-900">{t("content.statement")}</Text>
              {CONTENT.map((detail) => (
                <Text className="m-0 mb-3 text-base text-neutral-900" key={detail}>
                  <span className="block text-sm text-neutral-500">{t(`content.${detail}`)}</span>
                  {values[detail]}
                </Text>
              ))}
            </Section>
            <Section>
              <Text className={PARAGRAPH_CLASSNAME}>{t("next", { days: REFUND_TERMS.REIMBURSEMENT_DAYS })}</Text>
              <Text className={PARAGRAPH_CLASSNAME}>{t.rich("questions", MAIL_TAGS)}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
