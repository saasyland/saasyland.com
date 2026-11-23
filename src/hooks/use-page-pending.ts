import { type RouteComponent, useRouter, useRouterState } from "@tanstack/react-router"

import type { FileRouteTypes } from "~/src/routeTree.gen"

export const usePagePending = (layout: FileRouteTypes["id"]): RouteComponent | undefined => {
  const router = useRouter()
  const pathname = useRouterState({ select: ({ location }) => location.pathname })

  return router
    .matchRoutes(pathname)
    .map(({ routeId }) => router.routesById[routeId])
    .find(({ id, options }) => id.startsWith(`${layout}/`) && options.pendingComponent !== undefined)?.options.pendingComponent
}
