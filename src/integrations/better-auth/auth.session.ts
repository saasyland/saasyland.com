import { type QueryClient, queryOptions } from "@tanstack/react-query"
import { createIsomorphicFn, createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { getSessionCookie } from "better-auth/cookies"

import { auth } from "~/src/integrations/better-auth/auth.server"

import { SESSION_QUERY_KEYS, SESSION_STALE_TIME_MS } from "~/src/modules/session/session.constants"

import { APP_SLUG } from "~/src/presentation/branding"

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: { public?: true }
  }
}

const requestSessions = new WeakMap<Request, ReturnType<typeof auth.api.getSession>>()

export const getRequestSession = createServerOnlyFn((request: Request) => {
  const cached = requestSessions.get(request)
  if (cached) {
    return cached
  }
  const session = auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } })
  requestSessions.set(request, session)
  return session
})

type RequestSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

const toClientSession = ({ session: { token: _token, ...session }, user }: RequestSession) => ({ session, user })

export const getCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getRequestSession(getRequest())
  return session && toClientSession(session)
})

export const getCurrentSessionQuery = queryOptions({
  queryFn: () => getCurrentSession(),
  queryKey: SESSION_QUERY_KEYS.CURRENT,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  retry: false,
  staleTime: SESSION_STALE_TIME_MS,
})

export const recheckSessionQuery = queryOptions({
  gcTime: 0,
  queryFn: () => getCurrentSession(),
  queryKey: SESSION_QUERY_KEYS.RECHECK,
  retry: false,
  staleTime: 0,
})

export const hasSessionCookie = createIsomorphicFn()
  .server(() => getSessionCookie(getRequest(), { cookiePrefix: APP_SLUG }) !== null)
  .client(() => false)

const isUserData = ({ meta }: { readonly meta?: { readonly public?: true } | undefined }): boolean => meta?.public !== true

export const removeUserData = (queryClient: QueryClient): void => {
  queryClient.getMutationCache().clear()
  queryClient.removeQueries({ predicate: isUserData })
}

export const refreshUserData = (queryClient: QueryClient): Promise<void> => queryClient.invalidateQueries({ predicate: isUserData })
