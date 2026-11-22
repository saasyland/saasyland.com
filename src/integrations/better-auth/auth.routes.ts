import type { QueryClient } from "@tanstack/react-query"
import { type ParsedLocation, redirect } from "@tanstack/react-router"
import zod from "zod/v4"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { SESSION_EXPIRED_CODE } from "~/src/integrations/better-auth/auth.errors"
import {
  type getCurrentSession,
  getCurrentSessionQuery,
  hasSessionCookie,
  recheckSessionQuery,
  removeUserData,
} from "~/src/integrations/better-auth/auth.session"
import type { AuthSearch } from "~/src/integrations/better-auth/auth.zod"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

interface AuthRouteContext {
  context: RouterContext
}

interface ProtectedRouteContext extends AuthRouteContext {
  location: Pick<ParsedLocation, "publicHref">
}

interface AuthPageContext extends AuthRouteContext {
  search: AuthSearch
}

interface RefusalRecheck {
  readonly error: unknown
  readonly queryClient: QueryClient
  readonly router: { readonly invalidate: () => Promise<void>; readonly isServer: boolean }
}

type RouteSession = Awaited<ReturnType<typeof getCurrentSession>>

const refusalSchema = zod.object({ message: zod.enum([ERROR_CODES.FORBIDDEN, ERROR_CODES.UNAUTHORIZED]) })

const loadRouteSession = async ({ context: { queryClient } }: AuthRouteContext, { fresh }: { fresh: boolean }): Promise<RouteSession> => {
  const previousSession = queryClient.getQueryData(getCurrentSessionQuery.queryKey)
  const session = await queryClient.query(fresh ? { ...getCurrentSessionQuery, staleTime: 0 } : getCurrentSessionQuery)
  if (previousSession?.user.id !== session?.user.id) {
    removeUserData(queryClient)
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
  }
  return session
}

const isAdmin = (role: string | null | undefined): boolean => hasPermission({ permission: { admin: ["access"] }, role })

const signInFirst = (search: AuthSearch & { readonly error?: typeof SESSION_EXPIRED_CODE }): never => {
  throw redirect({ replace: true, search, to: ROUTES.SIGN_IN })
}

const goToRedirectOrWorkspace = (search: AuthSearch, role: string | null | undefined): never => {
  if (search.redirect !== undefined) {
    throw redirect({ href: search.redirect, replace: true })
  }
  throw redirect({ replace: true, to: isAdmin(role) ? ROUTES.ADMIN : ROUTES.APP })
}

const requireSession = async (context: AuthRouteContext, search: AuthSearch, { fresh }: { fresh: boolean }) => {
  const hadSession = context.context.queryClient.getQueryData(getCurrentSessionQuery.queryKey)?.user !== undefined || hasSessionCookie()
  const session = await loadRouteSession(context, { fresh })
  if (!session) {
    return signInFirst(hadSession ? { ...search, error: SESSION_EXPIRED_CODE } : search)
  }
  return session
}

export const redirectIfSignedIn = async (context: AuthPageContext): Promise<void> => {
  const session = await loadRouteSession(context, { fresh: false })
  if (session) {
    goToRedirectOrWorkspace(context.search, session.user.role)
  }
}

export const redirectIfVerified = async (context: AuthPageContext): Promise<void> => {
  const session = await loadRouteSession(context, { fresh: false })
  if (session?.user.emailVerified === true) {
    goToRedirectOrWorkspace(context.search, session.user.role)
  }
}

export const requireSignedIn = async (context: ProtectedRouteContext) => ({
  session: await requireSession(context, { redirect: context.location.publicHref }, { fresh: false }),
})

export const requireAdmin = async (context: ProtectedRouteContext) => {
  const result = await requireSignedIn(context)
  if (!isAdmin(result.session.user.role)) {
    throw redirect({ replace: true, to: ROUTES.APP })
  }
  return result
}

export const redirectAfterAuth = async (context: AuthPageContext): Promise<never> => {
  const session = await requireSession(context, context.search, { fresh: true })
  return goToRedirectOrWorkspace(context.search, session.user.role)
}

export const recheckRefusedSession = async ({ error, queryClient, router }: RefusalRecheck): Promise<void> => {
  if (router.isServer || !refusalSchema.safeParse(error).success) {
    return
  }
  const admitted = queryClient.getQueryData(getCurrentSessionQuery.queryKey)
  const current = await queryClient.query(recheckSessionQuery).catch(() => admitted)
  if (admitted?.user.id !== current?.user.id || admitted?.user.role !== current?.user.role) {
    await queryClient.invalidateQueries({ exact: true, queryKey: getCurrentSessionQuery.queryKey, refetchType: "none" })
    await router.invalidate()
  }
}
