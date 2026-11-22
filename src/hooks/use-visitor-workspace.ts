import { useQuery } from "@tanstack/react-query"
import { useHydrated } from "@tanstack/react-router"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { useLastLoginMethod } from "~/src/hooks/use-last-login-method"

import type { NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

type Workspace = typeof ROUTES.ADMIN | typeof ROUTES.APP

export const workspaceOf = (role: string | null | undefined): Workspace =>
  hasPermission({ permission: { admin: ["access"] }, role }) ? ROUTES.ADMIN : ROUTES.APP

export const useVisitorWorkspace = (): Workspace | undefined => {
  const hydrated = useHydrated()
  const { hasSignedInBefore } = useLastLoginMethod()
  const { data } = useQuery({ ...getCurrentSessionQuery, enabled: hasSignedInBefore })

  if (!hydrated || data?.user === undefined) {
    return undefined
  }

  return workspaceOf(data.user.role)
}

export const signedInDestination = (entry: NavigationEntry, workspace: Workspace | undefined): Pick<NavigationEntry, "key" | "to"> =>
  workspace !== undefined && "signedIn" in entry ? { key: entry.signedIn.key, to: workspace } : entry
