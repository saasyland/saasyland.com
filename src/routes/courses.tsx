import type { JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { BackToTop } from "~/src/presentation/components/custom/back-to-top"
import { ContentNavigation } from "~/src/presentation/components/custom/content-navigation"
import { CataloguePending } from "~/src/presentation/components/custom/courses/courses-pending"
import { Footer } from "~/src/presentation/components/custom/footer"
import { PageFrame } from "~/src/presentation/components/custom/page-frame"

const CoursesLayout = (): JSX.Element => (
  <div className="dark relative isolate min-h-svh bg-background text-foreground">
    <PageFrame />
    <ContentNavigation />
    <main className="relative z-10">
      <Outlet />
    </main>
    <Footer />
    <BackToTop />
  </div>
)

const NAMESPACES = ["pages.courses"] as const

export const Route = createFileRoute("/courses")({
  component: CoursesLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: CataloguePending,
  staticData: { namespaces: NAMESPACES },
})
