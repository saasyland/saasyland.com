import "@tanstack/react-start/server-only"

import { eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { license } from "~/src/modules/license/license.schema"
import type { License } from "~/src/modules/license/license.types"

export const getLicense = async (userId: string): Promise<License["select"] | undefined> => {
  const [row] = await db.select().from(license).where(eq(license.userId, userId)).limit(1)

  return row
}
