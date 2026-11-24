import { useMemo } from "react"

import { useVisitorWorkspace } from "~/src/hooks/use-visitor-workspace"

import { FOOTER_NAVIGATION, HEADER_NAVIGATION } from "~/src/data/navigation"
import type { FooterNavigationColumn, SiteEntry } from "~/src/data/navigation.constants"

interface SiteNavigation {
  readonly footer: readonly FooterNavigationColumn[]
  readonly header: readonly SiteEntry[]
}

const WORKSPACE_HOOKS: readonly (() => string | undefined)[] = [useVisitorWorkspace]

const SIGNED_OUT_NAVIGATION: SiteNavigation = { footer: FOOTER_NAVIGATION, header: HEADER_NAVIGATION }

const signedInEntry = (entry: SiteEntry, workspace: string): SiteEntry =>
  entry.signedIn === undefined ? entry : { label: entry.signedIn.label, to: workspace }

const signedInNavigation = (workspace: string): SiteNavigation => ({
  footer: FOOTER_NAVIGATION.map(({ key, links }) => ({ key, links: links.map((link) => signedInEntry(link, workspace)) })),
  header: HEADER_NAVIGATION.map((entry) => signedInEntry(entry, workspace)),
})

export const useSiteNavigation = (): SiteNavigation => {
  const [workspace] = WORKSPACE_HOOKS.map((useWorkspace) => useWorkspace())

  return useMemo(() => (workspace === undefined ? SIGNED_OUT_NAVIGATION : signedInNavigation(workspace)), [workspace])
}
