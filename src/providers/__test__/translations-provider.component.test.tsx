import { Suspense } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { TranslationsProvider } from "~/src/providers/translations-provider"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { ROOT_NAMESPACES, messagesQueryOptions, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"

import type { TimezoneCode } from "~/src/modules/_core/constants/timezone"
import type { updatePreferencesMutation } from "~/src/modules/user/use-cases/update-preferences"
import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"

import { PreferencesCard } from "~/src/presentation/components/custom/preferences-card"

import commonMessages from "~/messages/en-US/common.json"
import preferencesCardMessages from "~/messages/en-US/components.custom.preferences-card.json"
import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import timezonesMessages from "~/messages/en-US/timezones.json"

const ACTIVATED_AT = new Date("2025-01-01T12:00:00Z")
const PUBLISHED_ON = new Date("2026-11-14")

const sessionRequest = vi.hoisted(() => vi.fn())
const save = vi.hoisted(() => vi.fn<NonNullable<typeof updatePreferencesMutation.mutationFn>>())

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})
vi.mock(import("~/src/modules/user/use-cases/update-preferences"), () => ({
  updatePreferencesMutation: { mutationFn: save, mutationKey: USER_MUTATION_KEYS.UPDATE_PREFERENCES },
}))

const sessionIn = (timezone: TimezoneCode) => {
  const session = createAuthSessionFixture()
  return { ...session, user: { ...session.user, timezone } }
}

const DateProbe = () => {
  const format = useFormatter()

  return (
    <>
      <p data-testid="instant">{format.dateTime(ACTIVATED_AT, "dateTime")}</p>
      <p data-testid="calendar-date">{format.dateTime(PUBLISHED_ON, "calendarDate")}</p>
    </>
  )
}

const renderDates = (queryClient: QueryClient) =>
  renderWithRouter(
    <Suspense fallback="pending">
      <TranslationsProvider>
        <DateProbe />
      </TranslationsProvider>
    </Suspense>,
    { queryClient },
  )

beforeEach(() => {
  sessionRequest.mockReset()
  save.mockReset().mockResolvedValue({ status: true })
  vi.spyOn(toast, "success").mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const Probe = () => {
  const t = useTranslations("common")
  return <span>{t("loading")}</span>
}

const BlogProbe = () => {
  const t = useTranslations("pages.blog")
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
  expect(await screen.findByText(commonMessages.loading)).toBeInTheDocument()
  expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "common" }).queryKey)).toEqual(commonMessages)
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
  const blog = createRoute({ component: BlogProbe, getParentRoute: () => root, path: "/blog", staticData: { namespaces: ["pages.blog"] } })
  const router = createRouter({ history: createMemoryHistory({ initialEntries: ["/blog"] }), routeTree: root.addChildren([blog]) })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  expect(await screen.findByText(pagesBlogMessages.metadata.title)).toBeInTheDocument()
  expect(screen.getByText(commonMessages.loading)).toBeInTheDocument()
  expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "pages.blog" }).queryKey)).toEqual(pagesBlogMessages)
})

describe("time zone", () => {
  it("formats dates in UTC for a visitor without a session and never fetches one", async () => {
    renderDates(new QueryClient())

    expect(await screen.findByTestId("instant")).toHaveTextContent("Jan 1, 2025, 12:00 PM UTC")
    expect(screen.getByTestId("calendar-date")).toHaveTextContent("Nov 14, 2026")
    expect(sessionRequest).not.toHaveBeenCalled()
  })

  it("applies the signed-in user's time zone with its label and keeps calendar dates on their day", async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, sessionIn("America/Los_Angeles"))
    renderDates(queryClient)

    expect(await screen.findByTestId("instant")).toHaveTextContent("Jan 1, 2025, 4:00 AM PST")
    expect(screen.getByTestId("calendar-date")).toHaveTextContent("Nov 14, 2026")
  })

  it("re-renders every date when the session changes", async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, sessionIn("Europe/Warsaw"))
    renderDates(queryClient)
    expect(await screen.findByTestId("instant")).toHaveTextContent("Jan 1, 2025, 1:00 PM GMT+1")

    queryClient.setQueryData(getCurrentSessionQuery.queryKey, sessionIn("Asia/Tokyo"))

    await waitFor(() => {
      expect(screen.getByTestId("instant")).toHaveTextContent("Jan 1, 2025, 9:00 PM GMT+9")
    })
  })

  it("shows the whole app in the time zone a user saves", async () => {
    const root = createRootRoute({
      component: () => (
        <Suspense fallback="pending">
          <TranslationsProvider>
            <Outlet />
          </TranslationsProvider>
        </Suspense>
      ),
    })
    const settings = createRoute({
      component: () => (
        <>
          <DateProbe />
          <PreferencesCard />
        </>
      ),
      getParentRoute: () => root,
      path: "/settings",
      staticData: { namespaces: ["timezones"] },
    })
    const router = createRouter({
      history: createMemoryHistory({ initialEntries: ["/settings"] }),
      routeTree: root.addChildren([settings]),
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, sessionIn("Europe/Warsaw"))
    sessionRequest.mockResolvedValue(sessionIn("Asia/Tokyo"))
    await preloadNamespaces({ locale: I18N.DEFAULT_LOCALE, namespaces: [...ROOT_NAMESPACES, "timezones"], queryClient })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    const user = userEvent.setup({ delay: null })
    const timezone = await screen.findByRole("combobox", { name: preferencesCardMessages.timezone.label })
    expect(screen.getByTestId("instant")).toHaveTextContent("1:00 PM GMT+1")

    await user.click(timezone)
    fireEvent.change(timezone, { target: { value: "Tokyo" } })
    await user.click(await screen.findByRole("option", { name: timezonesMessages["Asia/Tokyo"] }))
    await user.click(screen.getByRole("button", { name: preferencesCardMessages.save }))

    await waitFor(() => {
      expect(screen.getByTestId("instant")).toHaveTextContent("9:00 PM GMT+9")
    })
    expect(save).toHaveBeenCalledExactlyOnceWith({ timezone: "Asia/Tokyo" }, expect.anything())
  })
})
