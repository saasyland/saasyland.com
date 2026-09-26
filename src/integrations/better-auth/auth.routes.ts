import { redirect } from "@tanstack/react-router"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

interface AuthRouteContext {
  context: RouterContext
  preload?: boolean
}

const loadRouteSession = async ({ context: { queryClient }, preload = false }: AuthRouteContext, { recheck }: { recheck: boolean }) => {
  const previousSession = queryClient.getQueryData(getCurrentSessionQuery.queryKey)
  const session = await queryClient.query({ ...getCurrentSessionQuery, ...(recheck && !preload ? { staleTime: 0 } : {}) })
  if (previousSession?.user.id !== session?.user.id) {
    queryClient.clear()
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
  }
  return session
}

const redirectToWorkspace = (role: string | null | undefined): never => {
  throw redirect({ replace: true, to: hasPermission({ permission: { admin: ["access"] }, role }) ? ROUTES.ADMIN : ROUTES.APP })
}

export const redirectIfSignedIn = async (context: AuthRouteContext): Promise<void> => {
  const session = await loadRouteSession(context, { recheck: false })
  if (session) {
    redirectToWorkspace(session.user.role)
  }
}

export const requireSignedIn = async (context: AuthRouteContext) => {
  const session = await loadRouteSession(context, { recheck: true })
  if (!session) {
    throw redirect({ replace: true, to: ROUTES.SIGN_IN })
  }
  return { session }
}

export const requireAdmin = async (context: AuthRouteContext) => {
  const result = await requireSignedIn(context)
  if (!hasPermission({ permission: { admin: ["access"] }, role: result.session.user.role })) {
    throw redirect({ replace: true, to: ROUTES.APP })
  }
  return result
}

export const redirectAfterAuth = async (context: AuthRouteContext): Promise<never> => {
  const { session } = await requireSignedIn(context)
  return redirectToWorkspace(session.user.role)
}
