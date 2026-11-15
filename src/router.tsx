import { QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS } from "~/src/integrations/tanstack-query/query.cache"
import { LOCALE_REWRITE } from "~/src/integrations/use-intl/i18n.utils"

import { DefaultError } from "~/src/presentation/components/custom/default-error"
import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"

import { routeTree } from "~/src/routeTree.gen"

export interface RouterContext {
  queryClient: QueryClient
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: QUERY_GC_TIME_MS,
        staleTime: QUERY_STALE_TIME_MS,
      },
    },
  })

  const router = createRouter({
    context: { queryClient },
    defaultErrorComponent: DefaultError,
    defaultNotFoundComponent: DefaultNotFound,
    defaultPreload: "intent",
    defaultPreloadDelay: 100,
    defaultPreloadIntentProximity: 0,
    defaultPreloadStaleTime: 0,
    defaultStaleTime: QUERY_STALE_TIME_MS,
    defaultStructuralSharing: true,
    rewrite: LOCALE_REWRITE,
    routeTree,
    scrollRestoration: true,
    scrollRestorationBehavior: "instant",
  })

  setupRouterSsrQueryIntegration({ queryClient, router })

  return router
}
