import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { SITE_CONTENT_ID } from "~/src/data/navigation.constants"
import { PAGE_SKELETONS } from "~/src/data/skeletons"

import { PageFrame } from "~/src/presentation/components/custom/page-frame"

export const MarketingPending = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const Page = PAGE_SKELETONS.get(pathname)

  return (
    <>
      <PageFrame />
      <main className="relative z-10" id={SITE_CONTENT_ID}>
        {Page && <Page />}
      </main>
    </>
  )
}
