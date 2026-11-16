import "@tanstack/react-start/server-only"

import type { models } from "@polar-sh/sdk/2026-10"
import { eq } from "drizzle-orm"
import * as zod from "zod"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { LICENSE_CHECKOUT_FIELD, LICENSE_STATUS, type LICENSE_WEBHOOK_EVENTS } from "~/src/modules/license/license.constants"
import { licenseTierForProduct } from "~/src/modules/license/license.utils"
import { attachLicenseKey } from "~/src/modules/license/use-cases/attach-license-key"
import { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import { revokeLicense } from "~/src/modules/license/use-cases/revoke-license"
import { sendPurchaseConfirmationEmail } from "~/src/modules/license/use-cases/send-purchase-confirmation-email"
import { user } from "~/src/modules/user/user.schema"

interface PolarCustomer {
  readonly external_id?: string | null | undefined
}

interface OrderEvent {
  readonly data: {
    readonly created_at: string
    readonly currency: string
    readonly custom_field_data?: models.Order["custom_field_data"]
    readonly customer: PolarCustomer
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

const SINGLE_ROW = 1

const withdrawalConsentSchema = zod.object({ [LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT]: zod.literal(true) })

interface Account {
  readonly email: string
  readonly id: string
}

const findAccount = async ({ external_id: externalId }: PolarCustomer): Promise<Account | undefined> => {
  if (typeof externalId !== "string" || externalId.length === 0) {
    return undefined
  }

  const [account] = await db.select({ email: user.email, id: user.id }).from(user).where(eq(user.id, externalId)).limit(SINGLE_ROW)

  return account
}

const withdrawalConsentAt = ({ created_at: createdAt, custom_field_data: fields }: OrderEvent["data"]): Date | undefined =>
  withdrawalConsentSchema.safeParse(fields).success ? new Date(createdAt) : undefined

const grantedLicenseKeyId = ({ properties }: BenefitGrantEvent["data"]): string | undefined =>
  "license_key_id" in properties ? properties.license_key_id : undefined

export const licenseWebhookHandlers = {
  onBenefitGrantCreated: async ({ data }: BenefitGrantEvent): Promise<void> => {
    const licenseKeyId = grantedLicenseKeyId(data)

    if (licenseKeyId === undefined || data.order_id === null) {
      return
    }

    const account = await findAccount(data.customer)

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
    const tier = data.product_id === null ? undefined : licenseTierForProduct(data.product_id)
    const account = await findAccount(data.customer)

    if (account === undefined || tier === undefined) {
      console.error(`[license] order ${data.id} does not map to a known account and tier`)
      return
    }

    const consentAt = withdrawalConsentAt(data)

    await grantLicense({
      polarCustomerId: data.customer_id,
      polarOrderId: data.id,
      purchaseCreatedAt: new Date(data.created_at),
      tier,
      userId: account.id,
      withdrawalConsentAt: consentAt,
    })
    await sendPurchaseConfirmationEmail({ order: data, recipient: account.email, tier, withdrawalConsent: consentAt !== undefined })
  },

  onOrderRefunded: async ({ data }: OrderEvent): Promise<void> => {
    if (data.status !== POLAR_ORDER_STATUS.REFUNDED || data.product_id === null || licenseTierForProduct(data.product_id) === undefined) {
      return
    }

    const account = await findAccount(data.customer)

    if (account !== undefined) {
      await revokeLicense({ polarOrderId: data.id, status: LICENSE_STATUS.REFUNDED, userId: account.id })
    }
  },
} satisfies Record<keyof typeof LICENSE_WEBHOOK_EVENTS, unknown>
