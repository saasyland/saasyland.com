import "@tanstack/react-start/server-only"

import type { models } from "@polar-sh/sdk/2026-10"
import { eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import type { LICENSE_WEBHOOK_EVENTS } from "~/src/modules/license/license.constants"
import { licenseTierForProduct } from "~/src/modules/license/license.utils"
import { attachLicenseKey } from "~/src/modules/license/use-cases/attach-license-key"
import { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import { revokeLicense } from "~/src/modules/license/use-cases/revoke-license"
import { user } from "~/src/modules/user/user.schema"

interface PolarCustomer {
  readonly external_id?: string | null | undefined
}

interface OrderEvent {
  readonly data: {
    readonly created_at: string
    readonly customer: PolarCustomer
    readonly customer_id: string
    readonly id: string
    readonly product_id: string | null
    readonly status: models.OrderStatus
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

const accountId = async ({ external_id: externalId }: PolarCustomer): Promise<string | undefined> => {
  if (typeof externalId !== "string" || externalId.length === 0) {
    return undefined
  }

  const [account] = await db.select({ id: user.id }).from(user).where(eq(user.id, externalId)).limit(SINGLE_ROW)

  return account?.id
}

const grantedLicenseKeyId = ({ properties }: BenefitGrantEvent["data"]): string | undefined =>
  "license_key_id" in properties ? properties.license_key_id : undefined

export const licenseWebhookHandlers = {
  onBenefitGrantCreated: async ({ data }: BenefitGrantEvent): Promise<void> => {
    const licenseKeyId = grantedLicenseKeyId(data)

    if (licenseKeyId === undefined || data.order_id === null) {
      return
    }

    const userId = await accountId(data.customer)

    if (userId === undefined) {
      console.error(`[license] benefit grant ${data.id} does not belong to a known account`)
      return
    }

    await attachLicenseKey({ polarLicenseKeyId: licenseKeyId, polarOrderId: data.order_id, userId })
  },

  onBenefitGrantRevoked: async ({ data }: BenefitGrantEvent): Promise<void> => {
    if (grantedLicenseKeyId(data) === undefined || data.order_id === null) {
      return
    }

    const userId = await accountId(data.customer)

    if (userId !== undefined) {
      await revokeLicense({ polarOrderId: data.order_id, userId })
    }
  },

  onOrderPaid: async ({ data }: OrderEvent): Promise<void> => {
    const tier = data.product_id === null ? undefined : licenseTierForProduct(data.product_id)
    const userId = await accountId(data.customer)

    if (userId === undefined || tier === undefined) {
      console.error(`[license] order ${data.id} does not map to a known account and tier`)
      return
    }

    await grantLicense({
      polarCustomerId: data.customer_id,
      polarOrderId: data.id,
      purchaseCreatedAt: new Date(data.created_at),
      tier,
      userId,
    })
  },

  onOrderRefunded: async ({ data }: OrderEvent): Promise<void> => {
    if (data.status !== POLAR_ORDER_STATUS.REFUNDED || data.product_id === null || licenseTierForProduct(data.product_id) === undefined) {
      return
    }

    const userId = await accountId(data.customer)

    if (userId !== undefined) {
      await revokeLicense({ polarOrderId: data.id, userId })
    }
  },
} satisfies Record<keyof typeof LICENSE_WEBHOOK_EVENTS, unknown>
