import type { JSX } from "react"

import { Button, Heading, Section, Text } from "react-email"
import { createFormatter, createTranslator } from "use-intl"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"

import { REFUND_TERMS } from "~/src/data/refunds"

import type emailMessages from "~/messages/en-US/emails.withdrawal-notification-email.json"
import { EMAIL_DATE_TIME_FORMAT, EmailLayout } from "~/src/presentation/emails/email-layout"

export const WITHDRAWAL_NOTIFICATION_EMAIL_NAMESPACE = "emails.withdrawal-notification-email"

const PARAGRAPH_CLASSNAME = "m-0 mb-4 text-base text-neutral-600"

const BUTTON_CLASSNAME = "mt-3 mr-3 box-border rounded-md bg-neutral-900 px-5 py-3 text-center text-base text-white no-underline"

const DETAILS = ["submittedAt", "name", "email", "reference", "channel", "licence", "eligibility", "acknowledgement"] as const

type Detail = (typeof DETAILS)[number]

interface WithdrawalNotificationEmailProps {
  readonly accountUrl?: string
  readonly deadline: Date
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly polarUrl?: string
  readonly statement: Pick<
    Withdrawal["select"],
    "acknowledgedAt" | "channel" | "createdAt" | "eligibility" | "email" | "name" | "reference"
  >
  readonly tierName: string | undefined
}

export const WithdrawalNotificationEmail = ({
  accountUrl,
  deadline,
  locale,
  messages,
  polarUrl,
  statement,
  tierName,
}: Readonly<WithdrawalNotificationEmailProps>): JSX.Element => {
  const format = createFormatter({ formats: I18N.FORMATS, locale, timeZone: I18N.DEFAULT_TIMEZONE })
  const t = createTranslator({
    locale,
    messages: { emails: { "withdrawal-notification-email": messages } },
    namespace: "emails.withdrawal-notification-email",
  })

  const acknowledgement = (sentAt: Date | null): string => {
    if (sentAt === null) {
      return t("acknowledgement.notSent")
    }

    return t("acknowledgement.sent", { sentAt: format.dateTime(sentAt, EMAIL_DATE_TIME_FORMAT) })
  }

  const submittedAt = format.dateTime(statement.createdAt, EMAIL_DATE_TIME_FORMAT)
  const { name } = statement
  const values: Record<Detail, string> = {
    acknowledgement: acknowledgement(statement.acknowledgedAt),
    channel: t(`channel.${statement.channel}`),
    eligibility: t(`eligibility.${statement.eligibility}`, { days: REFUND_TERMS.WITHDRAWAL_DAYS }),
    email: statement.email,
    licence: tierName === undefined ? t("licence.unmatched") : t("licence.matched", { tier: tierName }),
    name,
    reference: statement.reference,
    submittedAt,
  }

  return (
    <EmailLayout lang={locale} preview={t("preview", { name, submittedAt })}>
      <Section>
        <Heading className="m-0 mb-4 text-2xl font-bold">{t("heading")}</Heading>
        <Text className={PARAGRAPH_CLASSNAME}>{t("intro", { name, submittedAt })}</Text>
        {DETAILS.map((detail) => (
          <Text className="m-0 mb-3 text-base text-neutral-900" key={detail}>
            <span className="block text-sm text-neutral-500">{t(`details.${detail}`)}</span>
            {values[detail]}
          </Text>
        ))}
        <Text className="mt-6 text-base text-neutral-600">
          {t("next", { deadline: format.dateTime(deadline, EMAIL_DATE_TIME_FORMAT) })}
        </Text>
        {accountUrl !== undefined && (
          <Button className={BUTTON_CLASSNAME} href={accountUrl}>
            {t("openAccount")}
          </Button>
        )}
        {polarUrl !== undefined && (
          <Button className={BUTTON_CLASSNAME} href={polarUrl}>
            {t("openOrder")}
          </Button>
        )}
      </Section>
    </EmailLayout>
  )
}
