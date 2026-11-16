import type { JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { layoutNamespaces } from "~/src/data/namespaces"
import { SITE_CONTENT_ID } from "~/src/data/navigation.constants"

import { Footer } from "~/src/presentation/components/custom/footer"
import { MarketingPending } from "~/src/presentation/components/custom/marketing-pending"
import { PageFrame } from "~/src/presentation/components/custom/page-frame"

const MarketingLayout = (): JSX.Element => (
  <>
    <PageFrame />
    <main className="relative z-10" id={SITE_CONTENT_ID}>
      <Outlet />
    </main>
    <Footer />
  </>
)

const NAMESPACES = [...layoutNamespaces("/_site/_marketing")] as const

export const Route = createFileRoute("/_site/_marketing")({
  component: MarketingLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: MarketingPending,
  staticData: { dark: true, namespaces: NAMESPACES },
})
