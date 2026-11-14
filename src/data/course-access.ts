import type { LinkOptions } from "@tanstack/react-router"

import * as AREA_COURSE_ACCESS from "~/src/data/course-access.entries"

export interface CourseAccessGrant {
  readonly holds: (userId: string) => Promise<boolean>
  readonly includedWith: readonly string[]
  readonly key: string
  readonly unlock: Readonly<Record<"signedIn" | "signedOut", LinkOptions>>
}

const AREAS: Readonly<Record<string, readonly CourseAccessGrant[]>> = AREA_COURSE_ACCESS

export const COURSE_ACCESS_GRANTS = Object.values(AREAS).flat()

export const holdsCourseAccess = async (userId: string): Promise<boolean> => {
  const holdings = await Promise.all(COURSE_ACCESS_GRANTS.map((grant) => grant.holds(userId)))

  return holdings.includes(true)
}
