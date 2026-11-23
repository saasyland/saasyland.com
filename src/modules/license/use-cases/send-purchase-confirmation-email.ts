import "@tanstack/react-start/server-only"

import { createElement } from "react"

import type { models } from "@polar-sh/sdk/2026-10"
import { getRequest } from "@tanstack/react-start/server"
import { createTranslator } from "use-intl"
import * as zod from "zod"

import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { localeField } from "~/src/modules/_core/utils/zod-fields"
import { LICENSE_CHECKOUT_METADATA, LICENSE_EMAIL_PURPOSE, type LicenseTier } from "~/src/modules/license/license.constants"
import { refundDeadline } from "~/src/modules/license/license.refunds"
import { localizedTierName, orderCurrencySchema } from "~/src/modules/license/license.utils"

import { holdsCourseAccess } from "~/src/data/course-access"
import { fromMinorUnits } from "~/src/data/currencies"

import type purchaseConfirmationMessages from "~/messages/en-US/emails.purchase-confirmation-email.json"
import type coursesStepMessages from "~/messages/en-US/purchase-email.courses.json"
import {
  PURCHASE_CONFIRMATION_EMAIL_NAMESPACE,
  PurchaseConfirmationEmail,
  type PurchaseConfirmationLinks,
  type PurchaseConfirmationStep,
} from "~/src/presentation/emails/purchase-confirmation-email"
import * as ROUTES from "~/src/routes"

const COURSES_STEP_NAMESPACE = "purchase-email.courses"

const orderLocaleSchema = zod.object({ [LICENSE_CHECKOUT_METADATA.LOCALE]: localeField })

type PaidOrder = Pick<models.Order, "created_at" | "currency" | "id" | "invoice_number" | "metadata" | "total_amount">

interface PurchaseConfirmation {
  readonly order: PaidOrder
  readonly recipient: Readonly<{ email: string; id: string }>
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
  docs: absoluteUrl(locale, ROUTES.DOCS_CLI),
  licence: absoluteUrl(locale, ROUTES.LICENCE),
  refunds: absoluteUrl(locale, ROUTES.REFUNDS),
  terms: absoluteUrl(locale, ROUTES.TERMS),
  withdrawal: absoluteUrl(locale, ROUTES.WITHDRAWAL),
})

const nextSteps = async (locale: SupportedLocale, userId: string): Promise<PurchaseConfirmationStep[]> => {
  if (!(await holdsCourseAccess(userId))) {
    return []
  }

  const messages = await loadNamespace<typeof coursesStepMessages>({ locale, namespace: COURSES_STEP_NAMESPACE })
  const t = createTranslator({ locale, messages: { "purchase-email": { courses: messages } }, namespace: COURSES_STEP_NAMESPACE })

  return [{ link: t("link"), text: t("text"), url: absoluteUrl(locale, ROUTES.COURSES) }]
}

export const sendPurchaseConfirmationEmail = async ({
  order,
  recipient,
  tier,
  withdrawalConsent,
}: Readonly<PurchaseConfirmation>): Promise<void> => {
  const locale = orderLocale(order.metadata)
  const currency = orderCurrencySchema.parse(order.currency)
  const orderedAt = new Date(order.created_at)
  const [messages, tierName, steps] = await Promise.all([
    loadNamespace<typeof purchaseConfirmationMessages>({ locale, namespace: PURCHASE_CONFIRMATION_EMAIL_NAMESPACE }),
    localizedTierName(locale, tier),
    nextSteps(locale, recipient.id),
  ])

  await sendEmail({
    idempotency: { purpose: LICENSE_EMAIL_PURPOSE.PURCHASE_CONFIRMATION, token: order.id },
    react: createElement(PurchaseConfirmationEmail, {
      amount: fromMinorUnits(order.total_amount, currency),
      currency,
      links: confirmationLinks(locale),
      locale,
      messages,
      orderedAt,
      reference: order.invoice_number ?? order.id,
      refundDeadline: refundDeadline(orderedAt),
      steps,
      tierName,
      withdrawalConsent,
    }),
    subject: createTranslator({ locale, messages })("subject", { tier: tierName }),
    to: recipient.email,
  })
}
