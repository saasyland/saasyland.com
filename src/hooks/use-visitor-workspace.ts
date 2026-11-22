import { useQuery } from "@tanstack/react-query"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { useLastLoginMethod } from "~/src/hooks/use-last-login-method"

import type { NavigationEntry } from "~/src/data/navigation.constants"

import { ROUTES } from "~/src/routes"

type Workspace = typeof ROUTES.ADMIN | typeof ROUTES.APP

export const workspaceOf = (role: string | null | undefined): Workspace =>
  hasPermission({ permission: { admin: ["access"] }, role }) ? ROUTES.ADMIN : ROUTES.APP

export const useVisitorWorkspace = (): Workspace | undefined => {
  const { hasSignedInBefore } = useLastLoginMethod()
  const { data } = useQuery({ ...getCurrentSessionQuery, enabled: hasSignedInBefore })

  return data?.user === undefined ? undefined : workspaceOf(data.user.role)
}

export const signedInDestination = (entry: NavigationEntry, workspace: Workspace | undefined): Pick<NavigationEntry, "key" | "to"> =>
  workspace !== undefined && "signedIn" in entry ? { key: entry.signedIn.key, to: workspace } : entry
