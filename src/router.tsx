import { QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { getGlobalStartContext } from "@tanstack/react-start"
import zod from "zod/v4"

import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS } from "~/src/integrations/tanstack-query/query.cache"
import { LOCALE_REWRITE } from "~/src/integrations/use-intl/i18n.utils"
import "~/src/integrations/zod/zod.config"

import { DefaultError } from "~/src/presentation/components/custom/default-error"
import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"

import { routeTree } from "~/src/routeTree.gen"

const ssrOptionsSchema = zod.object({ nonce: zod.string().exactOptional() }).default({})

const readStartContext: () => unknown = getGlobalStartContext

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
    ssr: ssrOptionsSchema.parse(readStartContext()),
  })

  setupRouterSsrQueryIntegration({ queryClient, router })

  return router
}
