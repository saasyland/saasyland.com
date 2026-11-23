import type { JSX } from "react"

import { useMatches } from "@tanstack/react-router"

import { usePagePending } from "~/src/hooks/use-page-pending"

import { SITE_CONTENT_ID } from "~/src/data/navigation.constants"

import { cn } from "~/src/lib/cn"

import { PageFrame } from "~/src/presentation/components/custom/page-frame"

export const MarketingPending = (): JSX.Element => {
  const isUnderHeader = useMatches({ select: (matches) => matches.some(({ staticData }) => staticData.underHeader === true) })
  const Page = usePagePending("/_site/_marketing")

  return (
    <>
      <PageFrame />
      <main className={cn("relative z-10", { "pt-header": !isUnderHeader })} id={SITE_CONTENT_ID}>
        {Page && <Page />}
      </main>
    </>
  )
}
