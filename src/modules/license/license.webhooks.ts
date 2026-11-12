import "@tanstack/react-start/server-only"

import type { models } from "@polar-sh/sdk/2026-10"

import { licenseTierForProduct } from "~/src/modules/license/license.utils"
import { attachLicenseKey } from "~/src/modules/license/use-cases/attach-license-key"
import { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import { revokeLicense } from "~/src/modules/license/use-cases/revoke-license"

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

export const licenseWebhookHandlers = {
  onBenefitGrantCreated: async ({ data }: BenefitGrantEvent): Promise<void> => {
    const externalId = data.customer.external_id
    const licenseKeyId = "license_key_id" in data.properties ? data.properties.license_key_id : undefined

    if (licenseKeyId === undefined || data.order_id === null) {
      return
    }

    if (typeof externalId !== "string" || externalId.length === 0) {
      console.error(`[license] benefit grant ${data.id} has no external customer`)
      return
    }

    await attachLicenseKey({ polarLicenseKeyId: licenseKeyId, polarOrderId: data.order_id, userId: externalId })
  },

  onBenefitGrantRevoked: async ({ data }: BenefitGrantEvent): Promise<void> => {
    const externalId = data.customer.external_id

    if (
      typeof externalId === "string" &&
      externalId.length > 0 &&
      "license_key_id" in data.properties &&
      typeof data.properties.license_key_id === "string" &&
      data.order_id !== null
    ) {
      await revokeLicense({ polarOrderId: data.order_id, userId: externalId })
    }
  },

  onOrderPaid: async ({ data }: OrderEvent): Promise<void> => {
    const externalId = data.customer.external_id
    const tier = data.product_id === null ? undefined : licenseTierForProduct(data.product_id)

    if (typeof externalId !== "string" || externalId.length === 0 || tier === undefined) {
      console.error(`[license] order ${data.id} does not map to a known user and tier`)
      return
    }

    await grantLicense({
      polarCustomerId: data.customer_id,
      polarOrderId: data.id,
      purchaseCreatedAt: new Date(data.created_at),
      tier,
      userId: externalId,
    })
  },

  onOrderRefunded: async ({ data }: OrderEvent): Promise<void> => {
    const externalId = data.customer.external_id

    if (
      typeof externalId === "string" &&
      externalId.length > 0 &&
      data.product_id !== null &&
      licenseTierForProduct(data.product_id) !== undefined
    ) {
      await revokeLicense({ polarOrderId: data.id, userId: externalId })
    }
  },
}
