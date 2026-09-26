import { QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import { deLocalizeUrl, localizeUrl } from "~/src/integrations/use-intl/i18n.utils"

import { DefaultError } from "~/src/presentation/components/custom/default-error"
import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"

import { routeTree } from "~/src/routeTree.gen"

const ONE_MIN_IN_MS = 60_000
const FIVE_MINS_IN_MS = 300_000

export interface RouterContext {
  queryClient: QueryClient
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: FIVE_MINS_IN_MS,
        staleTime: ONE_MIN_IN_MS,
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
    defaultStaleTime: ONE_MIN_IN_MS,
    defaultStructuralSharing: true,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
    routeTree,
    scrollRestoration: true,
    scrollRestorationBehavior: "instant",
  })

  setupRouterSsrQueryIntegration({ queryClient, router })

  return router
}
