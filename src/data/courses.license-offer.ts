import { lazyRouteComponent } from "@tanstack/react-router"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"

import type { LicenseOfferSection } from "~/src/data/license-offer"

import { CourseUnlocksPending } from "~/src/presentation/components/custom/app/course-unlocks-pending"

export const COURSES_LICENSE_OFFER = [
  {
    Pending: CourseUnlocksPending,
    Section: lazyRouteComponent(() => import("~/src/presentation/components/custom/app/course-unlocks"), "CourseUnlocks"),
    key: "courseUnlocks",
    load: ({ locale, queryClient }) => queryClient.query(catalogueQuery({ locale })),
  },
] as const satisfies readonly LicenseOfferSection[]
