import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { LICENSE_TIER, type LicenseTier } from "~/src/modules/license/license.constants"

export const COURSE_LICENCE_TIERS: ReadonlySet<LicenseTier> = new Set([LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY])

export interface Viewer {
  readonly isStaff: boolean
  readonly licensed: boolean
  readonly userId: string | undefined
}

export const GUEST: Viewer = { isStaff: false, licensed: false, userId: undefined }

export const hasLessonAccess = (access: Lesson["select"]["access"], viewer: Viewer): boolean => {
  if (access === LESSON_ACCESS.PREVIEW || viewer.isStaff) {
    return true
  }

  if (access === LESSON_ACCESS.ACCOUNT) {
    return viewer.userId !== undefined
  }

  return viewer.licensed
}
