import "@tanstack/react-start/server-only"

import { getRequest } from "@tanstack/react-start/server"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { GUEST, type Viewer } from "~/src/modules/lesson/lesson.access"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"

import { holdsCourseAccess, recordCourseAccessUse } from "~/src/data/course-access"

export const resolveViewer = async (): Promise<Viewer> => {
  const session = await getRequestSession(getRequest())
  if (!session) {
    return GUEST
  }

  const holdsAccess = await holdsCourseAccess(session.user.id)

  return {
    entitled: holdsAccess && session.user.emailVerified,
    isStaff: hasPermission({ permission: { course: ["read"] }, role: session.user.role }),
    mustConfirmEmail: holdsAccess && !session.user.emailVerified,
    userId: session.user.id,
  }
}

export const recordPaidLessonOpened = async (lesson: Pick<Lesson["select"], "access" | "id">, viewer: Viewer): Promise<void> => {
  if (lesson.access !== LESSON_ACCESS.PAID || !viewer.entitled) {
    return
  }

  await recordCourseAccessUse({ lessonId: lesson.id, userId: viewer.userId })
}
