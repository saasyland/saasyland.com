import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { type AnyRouter, createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { getGlobalStartContext } from "@tanstack/react-start"

import { recheckRefusedSession } from "~/src/integrations/better-auth/auth.routes"
import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS } from "~/src/integrations/tanstack-query/query.cache"
import { LOCALE_REWRITE } from "~/src/integrations/use-intl/i18n.utils"
import "~/src/integrations/zod/zod.config"

import { NAVIGATION_PENDING_MIN_MS, NAVIGATION_PENDING_MS } from "~/src/data/navigation.constants"

import { DefaultError } from "~/src/presentation/components/custom/default-error"
import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"

import { routeTree } from "~/src/routeTree.gen"

export interface RouterContext {
  queryClient: QueryClient
}

interface QueryError {
  readonly error: Error
  readonly queryClient: QueryClient
  readonly router: AnyRouter
}

const QUERY_ERROR_HANDLERS: readonly ((queryError: QueryError) => Promise<void>)[] = [recheckRefusedSession]

export const getRouter = () => {
  const onError = (error: Error): void => {
    for (const handle of QUERY_ERROR_HANDLERS) {
      void handle({ error, queryClient, router })
    }
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: QUERY_GC_TIME_MS,
        staleTime: QUERY_STALE_TIME_MS,
      },
    },
    mutationCache: new MutationCache({ onError }),
    queryCache: new QueryCache({ onError }),
  })

  const router = createRouter({
    context: { queryClient },
    defaultErrorComponent: DefaultError,
    defaultNotFoundComponent: DefaultNotFound,
    defaultPendingMinMs: NAVIGATION_PENDING_MIN_MS,
    defaultPendingMs: NAVIGATION_PENDING_MS,
    defaultPreload: "intent",
    defaultPreloadDelay: 100,
    defaultPreloadIntentProximity: 0,
    defaultPreloadStaleTime: QUERY_STALE_TIME_MS,
    defaultStaleTime: QUERY_STALE_TIME_MS,
    defaultStructuralSharing: true,
    rewrite: LOCALE_REWRITE,
    routeTree,
    scrollRestoration: true,
    scrollRestorationBehavior: "instant",
    ssr: getGlobalStartContext() ?? {},
  })

  setupRouterSsrQueryIntegration({ queryClient, router })

  return router
}
