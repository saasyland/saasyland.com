import type { JSX } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vite-plus/test"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { SESSION_ATTRIBUTE } from "~/src/modules/session/session.rewrite"

import { useVisitorWorkspace } from "~/src/hooks/use-visitor-workspace"

import * as ROUTES from "~/src/routes"

const sessionRequest = vi.hoisted(() => vi.fn())

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})

const SIGNED_OUT = "Sign in"

const Workspace = (): JSX.Element => <p>{useVisitorWorkspace() ?? SIGNED_OUT}</p>

const withQueries = (queryClient: QueryClient): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <Workspace />
  </QueryClientProvider>
)

const isMarked = (): boolean => document.documentElement.hasAttribute(SESSION_ATTRIBUTE)

afterEach(() => {
  document.documentElement.removeAttribute(SESSION_ATTRIBUTE)
  document.body.replaceChildren()
  sessionRequest.mockReset()
})

it("hydrates the signed-out text a prerendered page holds, even when the browser already has the session, and shows the workspace after", async () => {
  const container = document.createElement("div")
  document.body.replaceChildren(container)
  container.innerHTML = renderToString(withQueries(new QueryClient()))
  document.documentElement.setAttribute(SESSION_ATTRIBUTE, "")
  const cached = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  cached.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture({ role: ROLE_CODES.ADMIN }))
  const onRecoverableError = vi.fn<() => void>()

  act(() => {
    hydrateRoot(container, withQueries(cached), { onRecoverableError })
  })

  expect(await screen.findByText(ROUTES.ADMIN)).toBeVisible()
  expect(onRecoverableError).not.toHaveBeenCalled()
  expect(isMarked()).toBe(true)
})

it("asks a page the Worker marked as signed in for its session, and leads a customer to the customer workspace", async () => {
  document.documentElement.setAttribute(SESSION_ATTRIBUTE, "")
  sessionRequest.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER }))

  render(withQueries(new QueryClient()))

  expect(await screen.findByText(ROUTES.APP)).toBeVisible()
  expect(sessionRequest).toHaveBeenCalledOnce()
})

it("asks for no session on a page the Worker left unmarked, whatever cookies the browser kept from an earlier sign-in", () => {
  sessionRequest.mockResolvedValue(createAuthSessionFixture())

  render(withQueries(new QueryClient()))

  expect(screen.getByText(SIGNED_OUT)).toBeVisible()
  expect(sessionRequest).not.toHaveBeenCalled()
  expect(isMarked()).toBe(false)
})

it("removes the mark when the session behind the cookie has ended, so the page shows sign-in again", async () => {
  document.documentElement.setAttribute(SESSION_ATTRIBUTE, "")
  sessionRequest.mockResolvedValue(createMissingAuthSessionResult())

  render(withQueries(new QueryClient()))

  await waitFor(() => {
    expect(isMarked()).toBe(false)
  })
  expect(screen.getByText(SIGNED_OUT)).toBeVisible()
})

it("marks the page once the visitor signs in without reloading it", async () => {
  const queryClient = new QueryClient()
  render(withQueries(queryClient))

  act(() => {
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER }))
  })

  expect(await screen.findByText(ROUTES.APP)).toBeVisible()
  expect(isMarked()).toBe(true)
  expect(sessionRequest).not.toHaveBeenCalled()
})
