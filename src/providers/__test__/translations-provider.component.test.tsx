import { Suspense } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { act, render, screen } from "@testing-library/react"
import { useFormatter, useTranslations } from "use-intl/react"
import { expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { TranslationsProvider } from "~/src/providers/translations-provider"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { ROOT_NAMESPACES, messagesQueryOptions, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"

import errorsGlobalMessages from "~/messages/en-US/errors.global.json"
import pagesLandingMessages from "~/messages/en-US/pages.landing.json"

const ACTIVATED_AT = new Date("2025-01-01T12:00:00Z")
const PUBLISHED_ON = new Date("2026-11-14")
const PENDING = "pending"

const DateProbe = () => {
  const format = useFormatter()

  return (
    <>
      <p data-testid="instant">{`${format.dateTime(ACTIVATED_AT, "date")}, ${format.dateTime(ACTIVATED_AT, "time")}`}</p>
      <p data-testid="calendar-date">{format.dateTime(PUBLISHED_ON, "calendarDate")}</p>
    </>
  )
}

const loadNamespaces = (queryClient: QueryClient, namespaces: readonly string[] = ROOT_NAMESPACES) =>
  act(() => preloadNamespaces({ locale: I18N.DEFAULT_LOCALE, namespaces, queryClient }))

const renderDates = async () => {
  const queryClient = new QueryClient()
  await preloadNamespaces({ locale: I18N.DEFAULT_LOCALE, namespaces: ROOT_NAMESPACES, queryClient })

  return renderWithRouter(
    <Suspense fallback={PENDING}>
      <TranslationsProvider>
        <DateProbe />
      </TranslationsProvider>
    </Suspense>,
    { queryClient },
  )
}

const Probe = () => {
  const t = useTranslations("errors.global")
  return <span>{t("title")}</span>
}

const LandingProbe = () => {
  const t = useTranslations("pages.landing")
  return <span>{t("metadata.title")}</span>
}

it("loads shared translations through React Query before rendering consumers", async () => {
  const { queryClient } = renderWithRouter(
    <Suspense fallback={PENDING}>
      <TranslationsProvider>
        <Probe />
      </TranslationsProvider>
    </Suspense>,
  )
  expect(screen.getByText(PENDING)).toBeInTheDocument()
  expect(screen.queryByText(errorsGlobalMessages.title)).toBeNull()

  await loadNamespaces(queryClient)

  expect(screen.getByText(errorsGlobalMessages.title)).toBeInTheDocument()
  expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "errors.global" }).queryKey)).toEqual(
    errorsGlobalMessages,
  )
})

it("adds the namespaces declared by matched routes to the shared translations", async () => {
  const root = createRootRoute({
    component: () => (
      <Suspense fallback={PENDING}>
        <TranslationsProvider>
          <Probe />
          <Outlet />
        </TranslationsProvider>
      </Suspense>
    ),
  })
  const landing = createRoute({
    component: LandingProbe,
    getParentRoute: () => root,
    path: "/landing",
    staticData: { namespaces: ["pages.landing"] },
  })
  const router = createRouter({ history: createMemoryHistory({ initialEntries: ["/landing"] }), routeTree: root.addChildren([landing]) })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await act(() => router.load())

  await loadNamespaces(queryClient, [...ROOT_NAMESPACES, "pages.landing"])

  expect(screen.getByText(pagesLandingMessages.metadata.title)).toBeInTheDocument()
  expect(screen.getByText(errorsGlobalMessages.title)).toBeInTheDocument()
  expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "pages.landing" }).queryKey)).toEqual(
    pagesLandingMessages,
  )
})

it("formats dates in UTC for a visitor nobody has signed in as, and keeps calendar dates on their day", async () => {
  await renderDates()

  expect(screen.getByTestId("instant")).toHaveTextContent("Jan 1, 2025, 12:00 PM UTC")
  expect(screen.getByTestId("calendar-date")).toHaveTextContent("Nov 14, 2026")
})
