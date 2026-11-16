import "@tanstack/react-start/server-only"

import { createElement } from "react"

import type { models } from "@polar-sh/sdk/2026-10"
import { getRequest } from "@tanstack/react-start/server"
import { createTranslator } from "use-intl"
import * as zod from "zod"

import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { CURRENCY_CODES, fromMinorUnits } from "~/src/modules/_core/constants/currency"
import { localeField } from "~/src/modules/_core/utils/zod-fields"
import { LICENSE_CHECKOUT_METADATA, type LicenseTier } from "~/src/modules/license/license.constants"
import { refundDeadline } from "~/src/modules/license/license.refunds"

import type pricingMessages from "~/messages/en-US/components.custom.pricing.json"
import type purchaseConfirmationMessages from "~/messages/en-US/emails.purchase-confirmation-email.json"
import {
  PURCHASE_CONFIRMATION_EMAIL_NAMESPACE,
  PurchaseConfirmationEmail,
  type PurchaseConfirmationLinks,
} from "~/src/presentation/emails/purchase-confirmation-email"
import { ROUTES } from "~/src/routes"

const PRICING_NAMESPACE = "components.custom.pricing"

const orderLocaleSchema = zod.object({ [LICENSE_CHECKOUT_METADATA.LOCALE]: localeField })

const orderCurrencySchema = zod.string().toUpperCase().pipe(zod.enum(CURRENCY_CODES))

type PaidOrder = Pick<models.Order, "created_at" | "currency" | "id" | "invoice_number" | "metadata" | "total_amount">

interface PurchaseConfirmation {
  readonly order: PaidOrder
  readonly recipient: string
  readonly tier: LicenseTier
  readonly withdrawalConsent: boolean
}

const orderLocale = (metadata: PaidOrder["metadata"]): SupportedLocale => {
  const parsed = orderLocaleSchema.safeParse(metadata)

  return parsed.success ? parsed.data.locale : I18N.DEFAULT_LOCALE
}

const absoluteUrl = (locale: SupportedLocale, pathname: string): string =>
  new URL(localizePathname({ locale, pathname }), getRequest().url).toString()

const confirmationLinks = (locale: SupportedLocale): PurchaseConfirmationLinks => ({
  account: absoluteUrl(locale, ROUTES.APP_LICENSE),
  licence: absoluteUrl(locale, ROUTES.LICENCE),
  refunds: absoluteUrl(locale, ROUTES.REFUNDS),
  terms: absoluteUrl(locale, ROUTES.TERMS),
})

export const sendPurchaseConfirmationEmail = async ({
  order,
  recipient,
  tier,
  withdrawalConsent,
}: Readonly<PurchaseConfirmation>): Promise<void> => {
  const locale = orderLocale(order.metadata)
  const currency = orderCurrencySchema.parse(order.currency)
  const orderedAt = new Date(order.created_at)
  const [messages, pricing] = await Promise.all([
    loadNamespace<typeof purchaseConfirmationMessages>({ locale, namespace: PURCHASE_CONFIRMATION_EMAIL_NAMESPACE }),
    loadNamespace<typeof pricingMessages>({ locale, namespace: PRICING_NAMESPACE }),
  ])
  const tierName = createTranslator({ locale, messages: pricing })(`tiers.${tier}.name`)

  await sendEmail({
    idempotency: { purpose: EMAIL_PURPOSE.PURCHASE_CONFIRMATION, token: order.id },
    react: createElement(PurchaseConfirmationEmail, {
      amount: fromMinorUnits(order.total_amount, currency),
      currency,
      links: confirmationLinks(locale),
      locale,
      messages,
      orderedAt,
      reference: order.invoice_number ?? order.id,
      refundDeadline: refundDeadline(orderedAt),
      tierName,
      withdrawalConsent,
    }),
    subject: createTranslator({ locale, messages })("subject", { tier: tierName }),
    to: recipient,
  })
}
