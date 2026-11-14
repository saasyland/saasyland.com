import { linkOptions } from "@tanstack/react-router"
import { createServerOnlyFn } from "@tanstack/react-start"

import { LICENSE_STATUS, LICENSE_TIER, type LicenseTier } from "~/src/modules/license/license.constants"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

import type { CourseAccessGrant } from "~/src/data/course-access"
import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { ROUTES } from "~/src/routes"

const COURSE_TIERS: readonly LicenseTier[] = [LICENSE_TIER.COMPLETE, LICENSE_TIER.AGENCY]

export const LICENSE_COURSE_ACCESS = [
  {
    holds: createServerOnlyFn(async (userId: string) => {
      const license = await getLicense(userId)

      return license?.status === LICENSE_STATUS.ACTIVE && COURSE_TIERS.includes(license.tier)
    }),
    includedWith: COURSE_TIERS.map((tier) => `components.custom.pricing.tiers.${tier}.name`),
    key: "license",
    unlock: {
      signedIn: linkOptions({ search: { tier: LICENSE_TIER.COMPLETE }, to: ROUTES.APP_LICENSE }),
      signedOut: linkOptions({ hash: MARKETING_SECTION_IDS.PRICING, to: ROUTES.HOME }),
    },
  },
] as const satisfies readonly CourseAccessGrant[]
