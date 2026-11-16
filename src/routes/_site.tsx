import type { JSX } from "react"

import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router"

import { cn } from "~/src/lib/cn"

import { BackToTop } from "~/src/presentation/components/custom/back-to-top"
import { Navigation } from "~/src/presentation/components/custom/navigation"

const SiteLayout = (): JSX.Element => {
  const isDark = useMatches({ select: (matches) => matches.some(({ staticData }) => staticData.dark === true) })

  return (
    <div className={cn("relative isolate min-h-svh bg-background text-foreground", { dark: isDark })}>
      <Navigation />
      <Outlet />
      <BackToTop />
    </div>
  )
}

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
})
