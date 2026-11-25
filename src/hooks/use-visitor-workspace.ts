import { useEffect } from "react"

import { useQuery } from "@tanstack/react-query"
import { useHydrated } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { SESSION_ATTRIBUTE } from "~/src/modules/session/session.rewrite"

import { ROUTES } from "~/src/routes"

type Workspace = typeof ROUTES.ADMIN.INDEX | typeof ROUTES.APP.INDEX

const workspaceOf = (role: string | null | undefined): Workspace =>
  hasPermission({ permission: { admin: ["access"] }, role }) ? ROUTES.ADMIN.INDEX : ROUTES.APP.INDEX

const isMarkedSignedIn = createClientOnlyFn(() => document.documentElement.hasAttribute(SESSION_ATTRIBUTE))

const markSignedIn = createClientOnlyFn((signedIn: boolean) => document.documentElement.toggleAttribute(SESSION_ATTRIBUTE, signedIn))

export const useVisitorWorkspace = (): Workspace | undefined => {
  const hydrated = useHydrated()
  const { data } = useQuery({ ...getCurrentSessionQuery, enabled: hydrated && isMarkedSignedIn() })

  useEffect(() => {
    if (data !== undefined) {
      markSignedIn(data !== null)
    }
  }, [data])

  if (!hydrated || data?.user === undefined) {
    return
  }

  return workspaceOf(data.user.role)
}
