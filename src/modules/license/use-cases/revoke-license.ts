import "@tanstack/react-start/server-only"

import { and, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { license, revokedLicenseOrder } from "~/src/modules/license/license.schema"

export const revokeLicense = async ({ polarOrderId, userId }: Readonly<{ polarOrderId: string; userId: string }>): Promise<void> => {
  const matchingOrder = and(eq(license.userId, userId), eq(license.polarOrderId, polarOrderId))
  await db.batch([
    db.insert(revokedLicenseOrder).values({ polarOrderId, userId }).onConflictDoNothing(),
    db.update(license).set({ status: LICENSE_STATUS.REVOKED }).where(matchingOrder),
  ])
}
