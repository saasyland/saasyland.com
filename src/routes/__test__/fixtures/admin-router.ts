import type { QueryKey } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { expect, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { getRouter } from "~/src/router"

type AdminRouter = ReturnType<typeof getRouter>

interface PrefetchedQuery {
  readonly queryFn?: unknown
  readonly queryKey: QueryKey
}

export const EMPTY_PAGE = { rows: [], total: 0 } as const

export const loadAsAdmin = async (path: string, session = createAuthSessionFixture({ role: ROLE_CODES.ADMIN })): Promise<AdminRouter> => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(session)
  vi.spyOn(getCurrentSessionQuery, "queryFn")
  const router = getRouter()
  router.options.context.queryClient.setDefaultOptions({ queries: { retry: false } })
  router.update({ context: router.options.context, history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router
}

export const expectLocalizedAdminPage = (router: AdminRouter): void => {
  expect(router.state.matches.at(-1)?.status).toBe("success")
  expect(getCurrentSessionQuery.queryFn).toHaveBeenCalledOnce()
  expect(router.state.matches.at(-1)?.loaderData).toHaveProperty("locale", "en-US")
  expect(router.state.matches.at(-1)?.loaderData).toHaveProperty("metadata.title")
}

export const expectPrefetched = (router: AdminRouter, query: PrefetchedQuery, data: unknown): void => {
  expect(query.queryFn).toHaveBeenCalledOnce()
  expect(router.options.context.queryClient.getQueryData(query.queryKey)).toEqual(data)
}
