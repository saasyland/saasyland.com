import "@tanstack/react-start/server-only"

import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import type { LicenseTier } from "~/src/modules/license/license.constants"
import { localizedTierName, polarOrderUrl } from "~/src/modules/license/license.utils"
import { WITHDRAWAL_EMAIL_PURPOSE } from "~/src/modules/withdrawal/withdrawal.constants"
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

const adminUserUrl = (origin: string, userId: string): string =>
  new URL(localizePathname({ locale: I18N.DEFAULT_LOCALE, pathname: `${ROUTES.ADMIN_USERS}/${userId}` }), origin).toString()

export const sendWithdrawalNotification = async ({ origin, statement, tier }: WithdrawalNotification): Promise<void> => {
  const locale = I18N.DEFAULT_LOCALE
  const [messages, tierName] = await Promise.all([
    loadNamespace<typeof notificationMessages>({ locale, namespace: WITHDRAWAL_NOTIFICATION_EMAIL_NAMESPACE }),
    tier && localizedTierName(locale, tier),
  ])

  const deadline = new Date(statement.createdAt.getTime() + REFUND_TERMS.REIMBURSEMENT_DAYS * MILLISECONDS_PER_DAY)

  await sendEmail({
    from: NOTIFICATIONS_EMAIL,
    idempotency: { purpose: WITHDRAWAL_EMAIL_PURPOSE.WITHDRAWAL_NOTIFICATION, token: statement.id },
    react: createElement(WithdrawalNotificationEmail, {
      deadline,
      locale,
      messages,
      statement,
      tierName,
      ...(statement.userId !== null && { accountUrl: adminUserUrl(origin, statement.userId) }),
      ...(statement.polarOrderId !== null && { polarUrl: polarOrderUrl(statement.polarOrderId) }),
    }),
    subject: createTranslator({ locale, messages })("subject", { name: statement.name }),
    to: CONTACT_EMAIL,
  })
}
