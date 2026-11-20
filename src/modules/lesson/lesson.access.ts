import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"

export interface Viewer {
  readonly entitled: boolean
  readonly isStaff: boolean
  readonly mustConfirmEmail: boolean
  readonly userId: string | undefined
}

export const GUEST: Viewer = { entitled: false, isStaff: false, mustConfirmEmail: false, userId: undefined }

export const hasLessonAccess = (access: Lesson["select"]["access"], viewer: Viewer): boolean => {
  if (access === LESSON_ACCESS.PREVIEW || viewer.isStaff) {
    return true
  }

  if (access === LESSON_ACCESS.ACCOUNT) {
    return viewer.userId !== undefined
  }

  return viewer.entitled
}
