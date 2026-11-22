import "@tanstack/react-start/server-only"

import { and, eq, inArray, isNull } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_STATUS, type LicenseTier } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"

interface LessonOpened {
  readonly lessonId: string
  readonly tiers: readonly LicenseTier[]
  readonly userId: string
}

export const recordLessonOpened = async ({ lessonId, tiers, userId }: LessonOpened): Promise<void> => {
  await db
    .update(license)
    .set({ lessonOpenedAt: new Date(), openedLessonId: lessonId })
    .where(
      and(
        eq(license.userId, userId),
        eq(license.status, LICENSE_STATUS.ACTIVE),
        inArray(license.tier, tiers),
        isNull(license.lessonOpenedAt),
      ),
    )
}
