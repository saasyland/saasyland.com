import type { JSX } from "react"

import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { layoutNamespaces } from "~/src/data/namespaces"
import { SITE_CONTENT_ID } from "~/src/data/navigation.constants"

import { cn } from "~/src/lib/cn"

import { Footer } from "~/src/presentation/components/custom/footer"
import { MarketingPending } from "~/src/presentation/components/custom/marketing-pending"
import { PageFrame } from "~/src/presentation/components/custom/page-frame"

const MarketingLayout = (): JSX.Element => {
  const isUnderHeader = useMatches({ select: (matches) => matches.some(({ staticData }) => staticData.underHeader === true) })

  return (
    <>
      <PageFrame />
      <main className={cn("relative z-10", { "pt-header": !isUnderHeader })} id={SITE_CONTENT_ID}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

const NAMESPACES = [...layoutNamespaces("/_site/_marketing")] as const

export const Route = createFileRoute("/_site/_marketing")({
  component: MarketingLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: MarketingPending,
  staticData: { dark: true, namespaces: NAMESPACES },
})
