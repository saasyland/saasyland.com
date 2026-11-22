import "@tanstack/react-start/server-only"

import { createElement } from "react"

import { createTranslator } from "use-intl"

import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import type { LicenseTier } from "~/src/modules/license/license.constants"
import { localizedTierName, polarOrderUrl } from "~/src/modules/license/license.utils"
import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"

import { REFUND_TERMS } from "~/src/data/refunds"

import { MILLISECONDS_PER_DAY } from "~/src/lib/duration"

import type notificationMessages from "~/messages/en-US/emails.withdrawal-notification-email.json"
import { CONTACT_EMAIL, NOTIFICATIONS_EMAIL } from "~/src/presentation/branding"
import {
  WITHDRAWAL_NOTIFICATION_EMAIL_NAMESPACE,
  WithdrawalNotificationEmail,
} from "~/src/presentation/emails/withdrawal-notification-email"
import { ROUTES } from "~/src/routes"

export interface WithdrawalNotification {
  readonly origin: string
  readonly statement: Withdrawal["select"]
  readonly tier: LicenseTier | undefined
}

const tierNameOf = (locale: SupportedLocale, tier: LicenseTier | undefined): Promise<string | undefined> => {
  if (tier === undefined) {
    return Promise.resolve(tier)
  }

  return localizedTierName(locale, tier)
}

const accountUrlOf = (origin: string, userId: string | null): string | undefined => {
  if (userId === null) {
    return undefined
  }

  return new URL(localizePathname({ locale: I18N.DEFAULT_LOCALE, pathname: `${ROUTES.ADMIN_USERS}/${userId}` }), origin).toString()
}

const polarUrlOf = (polarOrderId: string | null): string | undefined => {
  if (polarOrderId === null) {
    return undefined
  }

  return polarOrderUrl(polarOrderId)
}

export const sendWithdrawalNotification = async ({ origin, statement, tier }: Readonly<WithdrawalNotification>): Promise<void> => {
  const locale = I18N.DEFAULT_LOCALE
  const [messages, tierName] = await Promise.all([
    loadNamespace<typeof notificationMessages>({ locale, namespace: WITHDRAWAL_NOTIFICATION_EMAIL_NAMESPACE }),
    tierNameOf(locale, tier),
  ])

  const deadline = new Date(statement.createdAt.getTime() + REFUND_TERMS.REIMBURSEMENT_DAYS * MILLISECONDS_PER_DAY)

  await sendEmail({
    from: NOTIFICATIONS_EMAIL,
    idempotency: { purpose: EMAIL_PURPOSE.WITHDRAWAL_NOTIFICATION, token: statement.id },
    react: createElement(WithdrawalNotificationEmail, {
      accountUrl: accountUrlOf(origin, statement.userId),
      deadline,
      locale,
      messages,
      polarUrl: polarUrlOf(statement.polarOrderId),
      statement,
      tierName,
    }),
    subject: createTranslator({ locale, messages })("subject", { name: statement.name }),
    to: CONTACT_EMAIL,
  })
}
