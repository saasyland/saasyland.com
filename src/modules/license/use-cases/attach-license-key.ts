import "@tanstack/react-start/server-only"

import { and, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { license, revokedLicenseOrder } from "~/src/modules/license/license.schema"
import { licenseTierForProduct } from "~/src/modules/license/license.utils"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

const SINGLE_ROW = 1

interface AttachLicenseKeyInput {
  readonly polarLicenseKeyId: string
  readonly polarOrderId: string
  readonly userId: string
}

const isRevokedOrder = async (polarOrderId: string): Promise<boolean> => {
  const [revoked] = await db
    .select({ polarOrderId: revokedLicenseOrder.polarOrderId })
    .from(revokedLicenseOrder)
    .where(eq(revokedLicenseOrder.polarOrderId, polarOrderId))
    .limit(SINGLE_ROW)

  return revoked !== undefined
}

export const attachLicenseKey = async ({ polarLicenseKeyId, polarOrderId, userId }: Readonly<AttachLicenseKeyInput>): Promise<void> => {
  const current = await getLicense(userId)

  if (current?.polarOrderId === polarOrderId) {
    if (current.status !== LICENSE_STATUS.ACTIVE) {
      return
    }
    const { key } = await polar.licenseKeys.get(polarLicenseKeyId)
    await db
      .update(license)
      .set({ key, polarLicenseKeyId })
      .where(and(eq(license.userId, userId), eq(license.polarOrderId, polarOrderId), eq(license.status, LICENSE_STATUS.ACTIVE)))
    return
  }

  if (await isRevokedOrder(polarOrderId)) {
    return
  }

  const order = await polar.orders.get(polarOrderId)

  if (order.product_id === null || licenseTierForProduct(order.product_id) === undefined) {
    console.error(`[license] license key ${polarLicenseKeyId} was granted for order ${polarOrderId}, which is not a license purchase`)
    return
  }

  if (current === undefined || new Date(order.created_at) > current.purchaseCreatedAt) {
    throw new Error("The license purchase has not been recorded yet")
  }
}
