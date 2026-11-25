import "@tanstack/react-start/server-only"

import type { models } from "@polar-sh/sdk/2026-10"
import { eq } from "drizzle-orm"
import * as zod from "zod"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { LICENSE_CHECKOUT_FIELD, LICENSE_STATUS, type LICENSE_WEBHOOK_EVENTS } from "~/src/modules/license/license.constants"
import { upgradeOrigin } from "~/src/modules/license/license.upgrades"
import { licenseTierForProduct } from "~/src/modules/license/license.utils"
import { attachLicenseKey } from "~/src/modules/license/use-cases/attach-license-key"
import { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import { revertLicenseUpgrade } from "~/src/modules/license/use-cases/revert-license-upgrade"
import { revokeLicense } from "~/src/modules/license/use-cases/revoke-license"
import { sendPurchaseConfirmationEmail } from "~/src/modules/license/use-cases/send-purchase-confirmation-email"
import { sendUnmatchedOrderAlert } from "~/src/modules/license/use-cases/send-unmatched-order-alert"
import { upgradeLicense } from "~/src/modules/license/use-cases/upgrade-license"
import { user } from "~/src/modules/user/user.schema"

interface PolarCustomer {
  readonly external_id?: string | null | undefined
}

interface OrderEvent {
  readonly data: {
    readonly created_at: string
    readonly currency: string
    readonly custom_field_data?: models.Order["custom_field_data"]
    readonly customer: PolarCustomer & Pick<models.OrderCustomer, "email" | "name">
    readonly customer_id: string
    readonly id: string
    readonly invoice_number: models.Order["invoice_number"]
    readonly metadata: models.Order["metadata"]
    readonly product_id: string | null
    readonly status: models.OrderStatus
    readonly total_amount: number
  }
}

interface BenefitGrantEvent {
  readonly data: {
    readonly customer: PolarCustomer
    readonly id: string
    readonly order_id: string | null
    readonly properties: models.BenefitGrantWebhook["properties"]
  }
}

const externalIdSchema = zod.string().min(1)

const withdrawalConsentSchema = zod
  .object({
    created_at: zod.string(),
    custom_field_data: zod.object({ [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: zod.literal(true) }),
  })
  .transform(({ created_at: createdAt }) => new Date(createdAt))

const licenseKeyGrantSchema = zod.object({ license_key_id: zod.string() })

interface Account {
  readonly email: string
  readonly id: string
}

const accountRows = (userId: string) => db.select({ email: user.email, id: user.id }).from(user).where(eq(user.id, userId)).limit(1)

const findAccount = async ({ external_id: externalId }: PolarCustomer): Promise<Account | undefined> => {
  const userId = externalIdSchema.safeParse(externalId)
  const [account] = userId.success ? await accountRows(userId.data) : []

  return account
}

const findOrderAccount = async (customer: PolarCustomer, orderId: string): Promise<Account | undefined> => {
  const account = await findAccount(customer)

  if (account !== undefined) {
    return account
  }

  const current = await polar.orders.get(orderId)

  return findAccount(current.customer)
}

const withdrawalConsentAt = (order: OrderEvent["data"]): Date | undefined => withdrawalConsentSchema.safeParse(order).data

const grantedLicenseKeyId = ({ properties }: BenefitGrantEvent["data"]): string | undefined =>
  licenseKeyGrantSchema.safeParse(properties).data?.license_key_id

export const licenseWebhookHandlers = {
  onBenefitGrantCreated: async ({ data }: BenefitGrantEvent): Promise<void> => {
    const licenseKeyId = grantedLicenseKeyId(data)

    if (licenseKeyId === undefined || data.order_id === null) {
      return
    }

    const account = await findOrderAccount(data.customer, data.order_id)

    if (account === undefined) {
      console.error(`[license] benefit grant ${data.id} does not belong to a known account`)
      return
    }

    await attachLicenseKey({ polarLicenseKeyId: licenseKeyId, polarOrderId: data.order_id, userId: account.id })
  },

  onBenefitGrantRevoked: async ({ data }: BenefitGrantEvent): Promise<void> => {
    if (grantedLicenseKeyId(data) === undefined || data.order_id === null) {
      return
    }

    const account = await findAccount(data.customer)

    if (account !== undefined) {
      await revokeLicense({ polarOrderId: data.order_id, status: LICENSE_STATUS.REVOKED, userId: account.id })
    }
  },

  onOrderPaid: async ({ data }: OrderEvent): Promise<void> => {
    const tier = licenseTierForProduct(data.product_id)

    if (tier === undefined) {
      return
    }

    const account = await findOrderAccount(data.customer, data.id)

    if (account === undefined) {
      console.error(`[license] paid order ${data.id} maps to no account`)
      await sendUnmatchedOrderAlert({ order: data, tier })
      return
    }

    const consentAt = withdrawalConsentAt(data)
    const upgraded = await upgradeLicense({ origin: upgradeOrigin(data.metadata), tier, userId: account.id })

    if (!upgraded) {
      await grantLicense({
        polarCustomerId: data.customer_id,
        polarOrderId: data.id,
        purchaseCreatedAt: new Date(data.created_at),
        tier,
        userId: account.id,
        withdrawalConsentAt: consentAt,
      })
    }
    await sendPurchaseConfirmationEmail({ order: data, recipient: account, tier, withdrawalConsent: consentAt !== undefined })
  },

  onOrderRefunded: async ({ data }: OrderEvent): Promise<void> => {
    const tier = licenseTierForProduct(data.product_id)

    if (data.status !== POLAR_ORDER_STATUS.REFUNDED || tier === undefined) {
      return
    }

    const account = await findAccount(data.customer)

    if (account === undefined) {
      return
    }

    const origin = upgradeOrigin(data.metadata)

    if (origin !== undefined) {
      await revertLicenseUpgrade({ origin, tier, userId: account.id })
    }

    await revokeLicense({ polarOrderId: data.id, status: LICENSE_STATUS.REFUNDED, userId: account.id })
  },
} satisfies Record<keyof typeof LICENSE_WEBHOOK_EVENTS, unknown>
