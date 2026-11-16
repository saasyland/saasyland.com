import type { JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { CoursesPending } from "~/src/presentation/components/custom/courses/courses-pending"

const CoursesLayout = (): JSX.Element => (
  <div className="pt-header">
    <Outlet />
  </div>
)

const NAMESPACES = ["pages.courses"] as const

export const Route = createFileRoute("/_site/_marketing/courses")({
  component: CoursesLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: CoursesPending,
  staticData: { namespaces: NAMESPACES },
})
