import type { JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { Footer } from "~/src/presentation/components/custom/footer"
import { MarketingPending } from "~/src/presentation/components/custom/marketing-pending"
import { Navigation } from "~/src/presentation/components/custom/navigation"
import { PageFrame } from "~/src/presentation/components/custom/page-frame"

const LandingLayout = (): JSX.Element => (
  <div className="dark relative isolate min-h-svh bg-background text-foreground">
    <PageFrame />
    <Navigation />
    <main className="relative z-10">
      <Outlet />
    </main>
    <Footer />
  </div>
)

const NAMESPACES = ["auth.validations"] as const

export const Route = createFileRoute("/_landing")({
  component: LandingLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: MarketingPending,
  staticData: { namespaces: NAMESPACES },
})
