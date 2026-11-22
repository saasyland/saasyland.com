import type { JSX } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { LAST_LOGIN_METHOD_COOKIE, LOGIN_METHOD } from "~/src/integrations/better-auth/auth.constants"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { useVisitorWorkspace } from "~/src/hooks/use-visitor-workspace"

import { ROUTES } from "~/src/routes"

const SIGNED_OUT = "Sign in"

const Workspace = (): JSX.Element => <p>{useVisitorWorkspace() ?? SIGNED_OUT}</p>

const withQueries = (queryClient: QueryClient): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <Workspace />
  </QueryClientProvider>
)

afterEach(() => {
  document.cookie = `${LAST_LOGIN_METHOD_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  document.body.replaceChildren()
})

it("hydrates the signed-out text a prerendered page holds, even when the browser already has the session, and shows the workspace after", async () => {
  const container = document.createElement("div")
  document.body.replaceChildren(container)
  container.innerHTML = renderToString(withQueries(new QueryClient()))
  document.cookie = `${LAST_LOGIN_METHOD_COOKIE}=${LOGIN_METHOD.EMAIL}; path=/`
  const cached = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  cached.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture({ role: ROLE_CODES.ADMIN }))
  const onRecoverableError = vi.fn<() => void>()

  act(() => {
    hydrateRoot(container, withQueries(cached), { onRecoverableError })
  })

  expect(await screen.findByText(ROUTES.ADMIN)).toBeVisible()
  expect(onRecoverableError).not.toHaveBeenCalled()
})
