import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { starCountQuery } from "~/src/lib/github"

import { ProofSection } from "~/src/presentation/components/custom/landing-page/sections/proof-section"

import german from "~/messages/de-DE/pages.landing.json"
import english from "~/messages/en-US/pages.landing.json"

const fetchStarsMock = vi.hoisted(() => vi.fn<() => Promise<number>>())

vi.mock(import("~/src/lib/github"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, starCountQuery: { ...actual.starCountQuery, queryFn: fetchStarsMock } }
})

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderProof = async ({ locale = "en-US", stars }: { locale?: "en-US" | "de-DE"; stars?: number } = {}) => {
  const root = createRootRoute({
    component: () => (
      <IntlProvider locale={locale} messages={{ pages: { landing: locale === "de-DE" ? german : english } }} timeZone="UTC">
        <Outlet />
      </IntlProvider>
    ),
  })
  const layout = createRoute({ getParentRoute: () => root, id: "_landing" })
  const landing = createRoute({ component: ProofSection, getParentRoute: () => layout, loader: () => ({ stars }), path: "/" })
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: root.addChildren([layout.addChildren([landing])]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await act(() => router.load())
}

afterEach(() => {
  cleanup()
  queryClient.clear()
  fetchStarsMock.mockReset()
})

describe("landing page proof statistics", () => {
  it.each([
    { locale: "en-US", number: new Intl.NumberFormat("en-US") },
    { locale: "de-DE", number: new Intl.NumberFormat("de-DE") },
  ] as const)("shows the counts measured from the repository in $locale", async ({ locale, number }) => {
    fetchStarsMock.mockResolvedValue(1)

    await renderProof({ locale })

    for (const count of [
      REPOSITORY_FACTS.testFiles,
      REPOSITORY_FACTS.uiComponents,
      REPOSITORY_FACTS.adminSections,
      REPOSITORY_FACTS.currencies,
    ]) {
      expect(screen.getByText(number.format(count), { selector: "dd" })).toBeVisible()
    }
    expect(screen.getByText(`React ${String(REPOSITORY_FACTS.reactMajor)}`, { selector: "dd" })).toBeVisible()
    expect(screen.getByText(`TanStack v${String(REPOSITORY_FACTS.tanstackTableMajor)}`, { selector: "dd" })).toBeVisible()
  })

  it.each([
    { formatted: "54,321", locale: "en-US" },
    { formatted: "54.321", locale: "de-DE" },
  ] as const)("formats the actual GitHub count for $locale", async ({ formatted, locale }) => {
    fetchStarsMock.mockResolvedValue(54_321)

    await renderProof({ locale })

    expect(await screen.findByText(formatted, { selector: "dd" })).toBeVisible()
    expect(screen.queryByText("435", { selector: "dd" })).not.toBeInTheDocument()
  })

  it("shows a genuine zero-star count", async () => {
    fetchStarsMock.mockResolvedValue(0)

    await renderProof()

    expect(await screen.findByText("0", { selector: "dd" })).toBeVisible()
    expect(screen.queryByText("—", { selector: "dd" })).not.toBeInTheDocument()
  })

  it("shows a count loaded by the server immediately without a client fetch", async () => {
    queryClient.setQueryData(starCountQuery.queryKey, 54_321)

    await renderProof()

    expect(screen.getByText("54,321", { selector: "dd" })).toBeVisible()
    expect(fetchStarsMock).not.toHaveBeenCalled()
  })

  it("shows the count the page was rendered with after the query cache was cleared, then the refreshed count", async () => {
    const response = Promise.withResolvers<number>()
    fetchStarsMock.mockReturnValue(response.promise)

    await renderProof({ stars: 54_321 })

    expect(screen.getByText("54,321", { selector: "dd" })).toBeVisible()
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument()
    await act(async () => {
      response.resolve(54_322)
      await response.promise
    })
    expect(await screen.findByText("54,322", { selector: "dd" })).toBeVisible()
  })

  it("keeps other facts visible while the GitHub request is pending, then displays its result", async () => {
    const response = Promise.withResolvers<number>()
    fetchStarsMock.mockReturnValue(response.promise)

    await renderProof()

    expect(screen.getByText("100%", { selector: "dd" })).toBeVisible()
    expect(screen.queryByText("—", { selector: "dd" })).not.toBeInTheDocument()
    await act(async () => {
      response.resolve(54_321)
      await response.promise
    })
    expect(await screen.findByText("54,321", { selector: "dd" })).toBeVisible()
  })

  it("keeps the last verified count visible when refreshing the server-function request fails", async () => {
    queryClient.setQueryData(starCountQuery.queryKey, 54_321, { updatedAt: 0 })
    fetchStarsMock.mockRejectedValue(new Error("Server function unavailable"))

    await renderProof()

    await waitFor(() => {
      expect(queryClient.getQueryState(starCountQuery.queryKey)?.status).toBe("error")
    })
    expect(screen.getByText("GitHub stars", { selector: "dt" })).toBeVisible()
    expect(screen.getByText("100%", { selector: "dd" })).toBeVisible()
    expect(screen.getByText("54,321", { selector: "dd" })).toBeVisible()
    expect(screen.queryByText("—", { selector: "dd" })).not.toBeInTheDocument()
    expect(screen.queryByText("435", { selector: "dd" })).not.toBeInTheDocument()
  })
})
