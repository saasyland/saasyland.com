import { type ParsedLocation, redirect } from "@tanstack/react-router"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import type { AuthSearch } from "~/src/integrations/better-auth/auth.zod"

import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

interface AuthRouteContext {
  context: RouterContext
  preload?: boolean
}

interface ProtectedRouteContext extends AuthRouteContext {
  location: Pick<ParsedLocation, "publicHref">
}

interface AuthPageContext extends AuthRouteContext {
  search: AuthSearch
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

const isAdmin = (role: string | null | undefined): boolean => hasPermission({ permission: { admin: ["access"] }, role })

const signInFirst = (search: AuthSearch): never => {
  throw redirect({ replace: true, search, to: ROUTES.SIGN_IN })
}

const goToRedirectOrWorkspace = (search: AuthSearch, role: string | null | undefined): never => {
  if (search.redirect !== undefined) {
    throw redirect({ href: search.redirect, replace: true })
  }
  throw redirect({ replace: true, to: isAdmin(role) ? ROUTES.ADMIN : ROUTES.APP })
}

const requireSession = async (context: AuthRouteContext, search: AuthSearch) => {
  const session = await loadRouteSession(context, { recheck: true })
  if (!session) {
    return signInFirst(search)
  }
  return session
}

export const redirectIfSignedIn = async (context: AuthPageContext): Promise<void> => {
  const session = await loadRouteSession(context, { recheck: false })
  if (session) {
    goToRedirectOrWorkspace(context.search, session.user.role)
  }
}

export const requireSignedIn = async (context: ProtectedRouteContext) => ({
  session: await requireSession(context, { redirect: context.location.publicHref }),
})

export const requireAdmin = async (context: ProtectedRouteContext) => {
  const result = await requireSignedIn(context)
  if (!isAdmin(result.session.user.role)) {
    throw redirect({ replace: true, to: ROUTES.APP })
  }
  return result
}

export const redirectAfterAuth = async (context: AuthPageContext): Promise<never> => {
  const session = await requireSession(context, context.search)
  return goToRedirectOrWorkspace(context.search, session.user.role)
}
