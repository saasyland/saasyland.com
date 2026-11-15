import { Suspense } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { useFormatter, useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { TranslationsProvider } from "~/src/providers/translations-provider"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import errorsGlobalMessages from "~/messages/en-US/errors.global.json"
import pagesLandingMessages from "~/messages/en-US/pages.landing.json"

const ACTIVATED_AT = new Date("2025-01-01T12:00:00Z")
const PUBLISHED_ON = new Date("2026-11-14")

const DateProbe = () => {
  const format = useFormatter()

  return (
    <>
      <p data-testid="instant">{`${format.dateTime(ACTIVATED_AT, "date")}, ${format.dateTime(ACTIVATED_AT, "time")}`}</p>
      <p data-testid="calendar-date">{format.dateTime(PUBLISHED_ON, "calendarDate")}</p>
    </>
  )
}

afterEach(() => {
  vi.doUnmock("~/src/data/time-zone.entries")
  vi.resetModules()
})

const renderDatesWith = async (sources: Readonly<Record<string, readonly { readonly useTimeZone: () => string }[]>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/time-zone.entries", () => sources)
  const { TranslationsProvider: Provider } = await import("~/src/providers/translations-provider")

  return renderWithRouter(
    <Suspense fallback="pending">
      <Provider>
        <DateProbe />
      </Provider>
    </Suspense>,
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
    <Suspense fallback="pending">
      <TranslationsProvider>
        <Probe />
      </TranslationsProvider>
    </Suspense>,
  )
  expect(await screen.findByText(errorsGlobalMessages.title)).toBeInTheDocument()
  expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "errors.global" }).queryKey)).toEqual(
    errorsGlobalMessages,
  )
})

it("adds the namespaces declared by matched routes to the shared translations", async () => {
  const root = createRootRoute({
    component: () => (
      <Suspense fallback="pending">
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
  expect(await screen.findByText(pagesLandingMessages.metadata.title)).toBeInTheDocument()
  expect(screen.getByText(errorsGlobalMessages.title)).toBeInTheDocument()
  expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "pages.landing" }).queryKey)).toEqual(
    pagesLandingMessages,
  )
})

describe("time zone", () => {
  it("formats dates in UTC when no area supplies a time zone", async () => {
    await renderDatesWith({})

    expect(await screen.findByTestId("instant")).toHaveTextContent("Jan 1, 2025, 12:00 PM UTC")
    expect(screen.getByTestId("calendar-date")).toHaveTextContent("Nov 14, 2026")
  })

  it("formats dates in the time zone of the first area that supplies one and keeps calendar dates on their day", async () => {
    await renderDatesWith({
      FIRST_TIME_ZONES: [{ useTimeZone: () => "America/Los_Angeles" }],
      SECOND_TIME_ZONES: [{ useTimeZone: () => "Asia/Tokyo" }],
    })

    expect(await screen.findByTestId("instant")).toHaveTextContent("Jan 1, 2025, 4:00 AM PST")
    expect(screen.getByTestId("calendar-date")).toHaveTextContent("Nov 14, 2026")
  })
})
