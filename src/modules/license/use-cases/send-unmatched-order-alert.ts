import "@tanstack/react-start/server-only"

import { createElement } from "react"

import type { models } from "@polar-sh/sdk/2026-10"
import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { fromMinorUnits } from "~/src/modules/_core/constants/currency"
import { LICENSE_EMAIL_PURPOSE, type LicenseTier } from "~/src/modules/license/license.constants"
import { localizedTierName, orderCurrencySchema, polarOrderUrl } from "~/src/modules/license/license.utils"

import type alertMessages from "~/messages/en-US/emails.unmatched-order-alert-email.json"
import { CONTACT_EMAIL, NOTIFICATIONS_EMAIL } from "~/src/presentation/branding"
import { UNMATCHED_ORDER_ALERT_EMAIL_NAMESPACE, UnmatchedOrderAlertEmail } from "~/src/presentation/emails/unmatched-order-alert-email"

type UnmatchedOrder = Pick<models.Order, "created_at" | "currency" | "id" | "total_amount"> & {
  readonly customer: Pick<models.OrderCustomer, "email" | "name">
}

interface UnmatchedOrderAlert {
  readonly order: UnmatchedOrder
  readonly tier: LicenseTier
}

export const sendUnmatchedOrderAlert = async ({ order, tier }: UnmatchedOrderAlert): Promise<void> => {
  const locale = I18N.DEFAULT_LOCALE
  const currency = orderCurrencySchema.parse(order.currency)
  const [messages, tierName] = await Promise.all([
    loadNamespace<typeof alertMessages>({ locale, namespace: UNMATCHED_ORDER_ALERT_EMAIL_NAMESPACE }),
    localizedTierName(locale, tier),
  ])

  await sendEmail({
    from: NOTIFICATIONS_EMAIL,
    idempotency: { purpose: LICENSE_EMAIL_PURPOSE.UNMATCHED_ORDER_ALERT, token: order.id },
    react: createElement(UnmatchedOrderAlertEmail, {
      amount: fromMinorUnits(order.total_amount, currency),
      currency,
      customer: order.customer,
      locale,
      messages,
      orderId: order.id,
      orderedAt: new Date(order.created_at),
      polarUrl: polarOrderUrl(order.id),
      tierName,
    }),
    subject: createTranslator({ locale, messages })("subject", { tier: tierName }),
    to: CONTACT_EMAIL,
  })
}
