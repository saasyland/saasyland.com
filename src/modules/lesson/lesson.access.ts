import { type LinkOptions, linkOptions } from "@tanstack/react-router"
import { createServerOnlyFn } from "@tanstack/react-start"

import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { COURSE_LICENSE_TIERS, LICENSE_STATUS, OFFERED_COURSE_TIER } from "~/src/modules/license/license.constants"
import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { recordLessonOpened } from "~/src/modules/license/use-cases/record-lesson-opened"

import { TIER_PRICES } from "~/src/data/license"

import * as ROUTES from "~/src/routes"

interface SignedInViewer {
  readonly entitled: boolean
  readonly isStaff: boolean
  readonly mustConfirmEmail: boolean
  readonly userId: string
}

export const GUEST = { entitled: false, isStaff: false, mustConfirmEmail: false, userId: undefined } as const

export type Viewer = SignedInViewer | typeof GUEST

export const hasLessonAccess = (access: Lesson["select"]["access"], viewer: Viewer): boolean => {
  if (access === LESSON_ACCESS.PREVIEW || viewer.isStaff) {
    return true
  }

  if (access === LESSON_ACCESS.ACCOUNT) {
    return viewer.userId !== undefined
  }

  return viewer.entitled
}

export interface CourseAccessUse {
  readonly lessonId: string
  readonly userId: string
}

export interface CourseAccessGrant {
  readonly holders: string
  readonly holds: (userId: string) => Promise<boolean>
  readonly includedWith: readonly string[]
  readonly key: string
  readonly offer: string
  readonly price: number
  readonly recordUse: (use: CourseAccessUse) => Promise<void>
  readonly unlock: (redirect: string) => LinkOptions
}

export const COURSE_ACCESS_GRANTS: readonly CourseAccessGrant[] = [
  {
    holders: "components.custom.pricing.courseAccess.holders",
    holds: createServerOnlyFn(async (userId: string) => {
      const license = await getLicense(userId)

      return license?.status === LICENSE_STATUS.ACTIVE && COURSE_LICENSE_TIERS.includes(license.tier)
    }),
    includedWith: COURSE_LICENSE_TIERS.map((tier) => `components.custom.pricing.tiers.${tier}.name`),
    key: "license",
    offer: `components.custom.pricing.tiers.${OFFERED_COURSE_TIER}.name`,
    price: TIER_PRICES[OFFERED_COURSE_TIER],
    recordUse: createServerOnlyFn((use: CourseAccessUse) => recordLessonOpened({ ...use, tiers: COURSE_LICENSE_TIERS })),
    unlock: (redirect) => linkOptions({ search: { redirect, tier: OFFERED_COURSE_TIER }, to: ROUTES.APP_LICENSE }),
  },
]

export const holdsCourseAccess = async (userId: string): Promise<boolean> => {
  const holdings = await Promise.all(COURSE_ACCESS_GRANTS.map((grant) => grant.holds(userId)))

  return holdings.includes(true)
}

export const recordCourseAccessUse = async (use: CourseAccessUse): Promise<void> => {
  await Promise.all(COURSE_ACCESS_GRANTS.map((grant) => grant.recordUse(use)))
}
