import { createFileRoute } from "@tanstack/react-router"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { CataloguePending } from "~/src/presentation/components/custom/courses/courses-pending"

const NAMESPACES = ["pages.courses"] as const

export const Route = createFileRoute("/_site/_marketing/courses")({
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: CataloguePending,
  staticData: { namespaces: NAMESPACES },
})
