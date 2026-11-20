import type { LinkOptions } from "@tanstack/react-router"

import * as AREA_COURSE_ACCESS from "~/src/data/course-access.entries"

export interface CourseAccessGrant {
  readonly holders: string
  readonly holds: (userId: string) => Promise<boolean>
  readonly includedWith: readonly string[]
  readonly key: string
  readonly offer: string
  readonly price: number
  readonly unlock: (redirect: string) => LinkOptions
}

const AREAS: Readonly<Record<string, readonly CourseAccessGrant[]>> = AREA_COURSE_ACCESS

export const COURSE_ACCESS_GRANTS = Object.values(AREAS).flat()

export const holdsCourseAccess = async (userId: string): Promise<boolean> => {
  const holdings = await Promise.all(COURSE_ACCESS_GRANTS.map((grant) => grant.holds(userId)))

  return holdings.includes(true)
}
