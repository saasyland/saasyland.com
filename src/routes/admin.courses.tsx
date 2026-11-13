import { createFileRoute } from "@tanstack/react-router"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AdminCourseSectionPending } from "~/src/presentation/components/custom/admin/content-pending"

const NAMESPACES = ["course.validations", "pages.admin.courses"] as const

export const Route = createFileRoute("/admin/courses")({
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: AdminCourseSectionPending,
  staticData: { namespaces: NAMESPACES },
})
