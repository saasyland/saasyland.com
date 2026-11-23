import { linkOptions } from "@tanstack/react-router"
import { createServerOnlyFn } from "@tanstack/react-start"

import { LICENSE_STATUS, LICENSE_TIER, type LicenseTier } from "~/src/modules/license/license.constants"
import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { recordLessonOpened } from "~/src/modules/license/use-cases/record-lesson-opened"

import type { CourseAccessGrant, CourseAccessUse } from "~/src/data/course-access"
import { TIER_PRICES } from "~/src/data/marketing"

import * as ROUTES from "~/src/routes"

const COURSE_TIERS: readonly LicenseTier[] = [LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY]
const OFFERED_TIER = LICENSE_TIER.COMPLETE

export const LICENSE_COURSE_ACCESS = [
  {
    holders: "components.custom.pricing.courseAccess.holders",
    holds: createServerOnlyFn(async (userId: string) => {
      const license = await getLicense(userId)

      return license?.status === LICENSE_STATUS.ACTIVE && COURSE_TIERS.includes(license.tier)
    }),
    includedWith: COURSE_TIERS.map((tier) => `components.custom.pricing.tiers.${tier}.name`),
    key: "license",
    offer: `components.custom.pricing.tiers.${OFFERED_TIER}.name`,
    price: TIER_PRICES[OFFERED_TIER],
    recordUse: createServerOnlyFn((use: CourseAccessUse) => recordLessonOpened({ ...use, tiers: COURSE_TIERS })),
    unlock: (redirect) => linkOptions({ search: { redirect, tier: OFFERED_TIER }, to: ROUTES.APP_LICENSE }),
  },
] as const satisfies readonly CourseAccessGrant[]
