import "@tanstack/react-start/server-only"

import { getRequest } from "@tanstack/react-start/server"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { GUEST, type Viewer } from "~/src/modules/lesson/lesson.access"

import { holdsCourseAccess } from "~/src/data/course-access"

export const resolveViewer = async (): Promise<Viewer> => {
  const session = await getRequestSession(getRequest())
  if (!session) {
    return GUEST
  }

  return {
    entitled: await holdsCourseAccess(session.user.id),
    isStaff: hasPermission({ permission: { course: ["read"] }, role: session.user.role }),
    userId: session.user.id,
  }
}
