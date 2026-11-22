import "@tanstack/react-start/server-only"

import { and, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"

export const revokeAccountLicense = async (userId: string): Promise<void> => {
  await db
    .update(license)
    .set({ status: LICENSE_STATUS.REVOKED })
    .where(and(eq(license.userId, userId), eq(license.status, LICENSE_STATUS.ACTIVE)))
}
