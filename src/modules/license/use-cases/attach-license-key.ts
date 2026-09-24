import "@tanstack/react-start/server-only"

import { and, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"

import { license } from "~/src/modules/license/license.schema"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

interface AttachLicenseKeyInput {
  readonly polarLicenseKeyId: string
  readonly polarOrderId: string
  readonly userId: string
}

export const attachLicenseKey = async ({ polarLicenseKeyId, polarOrderId, userId }: Readonly<AttachLicenseKeyInput>): Promise<void> => {
  const current = await getLicense(userId)
  if (current === undefined) {
    throw new Error("The license purchase has not been recorded yet")
  }
  if (current.polarOrderId !== polarOrderId) {
    const order = await polar.orders.get({ id: polarOrderId })
    if (order.createdAt > current.purchaseCreatedAt) {
      throw new Error("The license purchase has not been recorded yet")
    }
    return
  }
  if (current.status !== "active") {
    return
  }
  const { key } = await polar.licenseKeys.get({ id: polarLicenseKeyId })

  await db
    .update(license)
    .set({ key, polarLicenseKeyId })
    .where(and(eq(license.userId, userId), eq(license.polarOrderId, polarOrderId), eq(license.status, "active")))
}
