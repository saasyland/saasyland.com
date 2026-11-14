import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { PAGE_SKELETONS } from "~/src/data/skeletons"

import { Navigation } from "~/src/presentation/components/custom/navigation"
import { PageFrame } from "~/src/presentation/components/custom/page-frame"

export const MarketingPending = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const Page = PAGE_SKELETONS.get(pathname)

  return (
    <div className="dark relative isolate min-h-svh bg-background text-foreground">
      <PageFrame />
      <Navigation />
      <main className="relative z-10">{Page && <Page />}</main>
    </div>
  )
}
