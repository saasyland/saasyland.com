import "@tanstack/react-start/server-only"

import { getRequest } from "@tanstack/react-start/server"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { COURSE_LICENCE_TIERS, GUEST, type Viewer } from "~/src/modules/lesson/lesson.access"
import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

export const resolveViewer = async (): Promise<Viewer> => {
  const session = await getRequestSession(getRequest())
  if (!session) {
    return GUEST
  }

  const license = await getLicense(session.user.id)

  return {
    isStaff: hasPermission({ permission: { course: ["read"] }, role: session.user.role }),
    licensed: license?.status === LICENSE_STATUS.ACTIVE && COURSE_LICENCE_TIERS.has(license.tier),
    userId: session.user.id,
  }
}
