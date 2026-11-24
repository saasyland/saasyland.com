import { useQuery } from "@tanstack/react-query"
import { useHydrated } from "@tanstack/react-router"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { useLastLoginMethod } from "~/src/hooks/use-last-login-method"

import type { NavigationEntry, SiteEntry } from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"

type Workspace = typeof ROUTES.ADMIN | typeof ROUTES.APP

const workspaceOf = (role: string | null | undefined): Workspace =>
  hasPermission({ permission: { admin: ["access"] }, role }) ? ROUTES.ADMIN : ROUTES.APP

export const useVisitorWorkspace = (): Workspace | undefined => {
  const hydrated = useHydrated()
  const { hasSignedInBefore } = useLastLoginMethod()
  const { data } = useQuery({ ...getCurrentSessionQuery, enabled: hasSignedInBefore })

  if (!hydrated || data?.user === undefined) {
    return
  }

  return workspaceOf(data.user.role)
}

export const signedInDestination = (entry: SiteEntry, workspace: Workspace | undefined): NavigationEntry =>
  workspace !== undefined && entry.signedIn !== undefined ? { label: entry.signedIn.label, to: workspace } : entry
