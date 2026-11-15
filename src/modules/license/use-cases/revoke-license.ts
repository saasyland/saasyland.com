import "@tanstack/react-start/server-only"

import { and, eq, ne } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { license, revokedLicenseOrder } from "~/src/modules/license/license.schema"

interface RevokeLicenseInput {
  readonly polarOrderId: string
  readonly status: typeof LICENSE_STATUS.REFUNDED | typeof LICENSE_STATUS.REVOKED
  readonly userId: string
}

export const revokeLicense = async ({ polarOrderId, status, userId }: RevokeLicenseInput): Promise<void> => {
  const matchingOrder = and(eq(license.userId, userId), eq(license.polarOrderId, polarOrderId), ne(license.status, LICENSE_STATUS.REFUNDED))
  await db.batch([
    db.insert(revokedLicenseOrder).values({ polarOrderId, userId }).onConflictDoNothing(),
    db.update(license).set({ status }).where(matchingOrder),
  ])
}
