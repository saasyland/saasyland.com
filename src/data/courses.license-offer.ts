import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"

import type { LicenseOfferSection } from "~/src/data/license-offer"

import { CourseUnlocks, CourseUnlocksPending } from "~/src/presentation/components/custom/app/course-unlocks"

export const COURSES_LICENSE_OFFER = [
  {
    Pending: CourseUnlocksPending,
    Section: CourseUnlocks,
    key: "courseUnlocks",
    load: ({ locale, queryClient }) => queryClient.query(catalogueQuery({ locale })),
  },
] as const satisfies readonly LicenseOfferSection[]
