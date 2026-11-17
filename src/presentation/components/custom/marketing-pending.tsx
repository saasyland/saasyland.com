import type { JSX } from "react"

import { useMatches, useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { SITE_CONTENT_ID } from "~/src/data/navigation.constants"
import { PAGE_SKELETONS } from "~/src/data/skeletons"

import { cn } from "~/src/lib/cn"

import { Navigation, SkipLink } from "~/src/presentation/components/custom/navigation"
import { PageFrame } from "~/src/presentation/components/custom/page-frame"

export const MarketingPending = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const isUnderHeader = useMatches({ select: (matches) => matches.some(({ staticData }) => staticData.underHeader === true) })
  const Page = PAGE_SKELETONS.get(pathname)

  return (
    <>
      <SkipLink />
      <Navigation />
      <PageFrame />
      <main className={cn("relative z-10", { "pt-header": !isUnderHeader })} id={SITE_CONTENT_ID}>
        {Page && <Page />}
      </main>
    </>
  )
}
