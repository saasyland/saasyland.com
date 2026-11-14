import { StrictMode } from "react"

import { QueryClient, QueryClientProvider, mutationOptions } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRoute, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { deLocalizeUrl, localizeUrl } from "~/src/integrations/use-intl/i18n.utils"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  CONFIRMATION_STATUS,
  NEWSLETTER_SUBSCRIBER_MUTATION_KEYS,
  NEWSLETTER_TOKEN_LENGTH,
  UNSUBSCRIBE_STATUS,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import type { NewsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"

import { Route as ConfirmRoute } from "~/src/routes/_landing.newsletter.confirm"
import { Route as UnsubscribeRoute } from "~/src/routes/_landing.newsletter.unsubscribe"

import spinnerMessages from "~/messages/pl-PL/components.shadcn.spinner.json"
import errorMessages from "~/messages/pl-PL/errors.json"
import confirmMessages from "~/messages/pl-PL/pages.newsletter.confirm.json"
import unsubscribeMessages from "~/messages/pl-PL/pages.newsletter.unsubscribe.json"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

const confirmMock = vi.hoisted(() =>
  vi.fn<(input: NewsletterSubscriber["confirmNewsletterSubscription"]) => Promise<{ confirmed: boolean }>>(),
)
const unsubscribeMock = vi.hoisted(() =>
  vi.fn<(input: NewsletterSubscriber["unsubscribeFromNewsletter"]) => Promise<{ unsubscribed: true }>>(),
)
const TOKEN = "a".repeat(NEWSLETTER_TOKEN_LENGTH)
const messages = getTestMessages("pl-PL")

const pageLoad = vi.hoisted(() => ({ fails: false }))

vi.mock(import("~/src/integrations/use-intl/i18n.messages"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    loadPageMetadata: (options) => {
      if (pageLoad.fails) {
        return Promise.reject(new Error("The page messages could not be loaded"))
      }
      return actual.loadPageMetadata(options)
    },
  }
})
vi.mock("~/src/modules/newsletter-subscriber/use-cases/confirm-newsletter-subscription", () => ({
  confirmNewsletterSubscriptionMutation: mutationOptions({
    mutationFn: confirmMock,
    mutationKey: NEWSLETTER_SUBSCRIBER_MUTATION_KEYS.CONFIRM,
  }),
}))
vi.mock("~/src/modules/newsletter-subscriber/use-cases/unsubscribe-from-newsletter", () => ({
  unsubscribeFromNewsletterMutation: mutationOptions({
    mutationFn: unsubscribeMock,
    mutationKey: NEWSLETTER_SUBSCRIBER_MUTATION_KEYS.UNSUBSCRIBE,
  }),
}))

const createNewsletterRouter = (path: string) => {
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  const landing = createRoute({ getParentRoute: () => root, id: "_landing" })
  const home = createRoute({ component: () => <p>Home</p>, getParentRoute: () => root, path: "/" })
  Object.assign(ConfirmRoute.options, { getParentRoute: () => landing, id: "/newsletter/confirm", path: "/newsletter/confirm" })
  Object.assign(UnsubscribeRoute.options, { getParentRoute: () => landing, id: "/newsletter/unsubscribe", path: "/newsletter/unsubscribe" })
  const queryClient = new QueryClient()
  return createRouter({
    Wrap: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    rewrite: { input: ({ url }) => deLocalizeUrl(url), output: ({ url }) => localizeUrl(url) },
    routeTree: root.addChildren([home, landing.addChildren([ConfirmRoute, UnsubscribeRoute])]),
  })
}

const renderNewsletter = async (path: string) => {
  const router = createNewsletterRouter(path)
  const view = render(
    <IntlProvider locale="pl-PL" messages={messages}>
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>
    </IntlProvider>,
  )
  await act(() => router.load())
  return { ...view, router }
}

beforeEach(() => {
  vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/pl-PL/"))
  vi.spyOn(globalThis, "scrollTo").mockImplementation(vi.fn<() => void>())
  pageLoad.fails = false
  confirmMock.mockReset().mockResolvedValue({ confirmed: true })
  unsubscribeMock.mockReset().mockResolvedValue({ unsubscribed: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("newsletter confirmation route", () => {
  it("only asks to confirm when the link is prefetched or opened, so a mail scanner cannot subscribe anyone", async () => {
    const { router } = await renderNewsletter("/")
    await act(() => router.preloadRoute({ search: { token: TOKEN }, to: ROUTES.NEWSLETTER_CONFIRM }))
    await act(() => router.navigate({ search: { token: TOKEN }, to: ROUTES.NEWSLETTER_CONFIRM }))

    expect(await screen.findByRole("heading", { level: 1, name: confirmMessages.prompt.title })).toBeVisible()
    expect(screen.getByRole("button", { name: confirmMessages.prompt.action })).toBeEnabled()
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it("confirms on press and replaces the token in the URL with the result", async () => {
    const { router } = await renderNewsletter(`${ROUTES.NEWSLETTER_CONFIRM}?token=${TOKEN}`)

    await userEvent.click(await screen.findByRole("button", { name: confirmMessages.prompt.action }))

    expect(await screen.findByRole("heading", { level: 1, name: confirmMessages.confirmed.title })).toBeVisible()
    expect(confirmMock).toHaveBeenCalledExactlyOnceWith({ token: TOKEN }, expect.anything())
    expect(router.state.location.searchStr).not.toContain("token")
    expect(router.state.location.search).toMatchObject({ status: CONFIRMATION_STATUS.CONFIRMED })
    expect(screen.getByRole("link")).toHaveAttribute("href", "/pl-PL")
  })

  it("shows the spent-link page when the token was already used or has expired", async () => {
    confirmMock.mockResolvedValue({ confirmed: false })
    const { router } = await renderNewsletter(`${ROUTES.NEWSLETTER_CONFIRM}?token=${TOKEN}`)

    await userEvent.click(await screen.findByRole("button", { name: confirmMessages.prompt.action }))

    expect(await screen.findByRole("heading", { level: 1, name: confirmMessages.expired.title })).toBeVisible()
    expect(router.state.location.searchStr).toBe("")
  })

  it("keeps the confirmed result on reload without calling the server again", async () => {
    await renderNewsletter(`${ROUTES.NEWSLETTER_CONFIRM}?status=${CONFIRMATION_STATUS.CONFIRMED}`)

    expect(await screen.findByRole("heading", { level: 1, name: confirmMessages.confirmed.title })).toBeVisible()
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it.each(["", "?token=short", "?status=unknown"])("renders a malformed link as spent without asking: %s", async (search) => {
    await renderNewsletter(`${ROUTES.NEWSLETTER_CONFIRM}${search}`)

    expect(await screen.findByRole("heading", { level: 1, name: confirmMessages.expired.title })).toBeVisible()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("explains a failure next to the button and confirms on the next press", async () => {
    confirmMock.mockRejectedValueOnce(new Error(ERROR_CODES.TOO_MANY_REQUESTS))
    await renderNewsletter(`${ROUTES.NEWSLETTER_CONFIRM}?token=${TOKEN}`)
    const button = await screen.findByRole("button", { name: confirmMessages.prompt.action })

    await userEvent.click(button)

    expect(await screen.findByRole("alert")).toHaveTextContent(errorMessages.codes.TOO_MANY_REQUESTS)
    await userEvent.click(button)
    expect(await screen.findByRole("heading", { level: 1, name: confirmMessages.confirmed.title })).toBeVisible()
    expect(confirmMock).toHaveBeenCalledTimes(2)
  })
})

describe("newsletter unsubscribe route", () => {
  it("only asks to unsubscribe when the link is prefetched or opened", async () => {
    const { router } = await renderNewsletter("/")
    await act(() => router.preloadRoute({ search: { token: TOKEN }, to: ROUTES.NEWSLETTER_UNSUBSCRIBE }))
    await act(() => router.navigate({ search: { token: TOKEN }, to: ROUTES.NEWSLETTER_UNSUBSCRIBE }))

    expect(await screen.findByRole("heading", { level: 1, name: unsubscribeMessages.prompt.title })).toBeVisible()
    expect(unsubscribeMock).not.toHaveBeenCalled()
  })

  it("unsubscribes on press and keeps the result after a reload without repeating it", async () => {
    const { router, unmount } = await renderNewsletter(`${ROUTES.NEWSLETTER_UNSUBSCRIBE}?token=${TOKEN}`)

    await userEvent.click(await screen.findByRole("button", { name: unsubscribeMessages.prompt.action }))

    expect(await screen.findByRole("heading", { level: 1, name: unsubscribeMessages.success.title })).toBeVisible()
    expect(router.state.location.searchStr).not.toContain("token")
    expect(router.state.location.search).toMatchObject({ status: UNSUBSCRIBE_STATUS.SUCCESS })
    const resultUrl = router.state.location.href
    unmount()
    await renderNewsletter(resultUrl)
    expect(await screen.findByRole("heading", { level: 1, name: unsubscribeMessages.success.title })).toBeVisible()
    expect(unsubscribeMock).toHaveBeenCalledExactlyOnceWith({ token: TOKEN }, expect.anything())
  })

  it.each(["", "?token=short", "?status=unknown"])(
    "renders a malformed unsubscribe link as an error without asking: %s",
    async (search) => {
      await renderNewsletter(`${ROUTES.NEWSLETTER_UNSUBSCRIBE}${search}`)

      expect(await screen.findByRole("heading", { level: 1, name: unsubscribeMessages.error.title })).toBeVisible()
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    },
  )

  it("explains a failure next to the button and unsubscribes on the next press", async () => {
    unsubscribeMock.mockRejectedValueOnce(new Error("Connection failed"))
    await renderNewsletter(`${ROUTES.NEWSLETTER_UNSUBSCRIBE}?token=${TOKEN}`)
    const button = await screen.findByRole("button", { name: unsubscribeMessages.prompt.action })

    await userEvent.click(button)

    expect(await screen.findByRole("alert")).toHaveTextContent(errorMessages.codes.INTERNAL_ERROR)
    await userEvent.click(button)
    expect(await screen.findByRole("heading", { level: 1, name: unsubscribeMessages.success.title })).toBeVisible()
    expect(unsubscribeMock).toHaveBeenCalledTimes(2)
  })
})

const pressTwiceWhilePending = async (path: string, action: string) => {
  await renderNewsletter(path)
  const button = await screen.findByRole("button", { name: action })
  await userEvent.click(button)
  await userEvent.click(button)
  return button
}

describe("newsletter actions in flight", () => {
  it("announces progress and ignores further presses until the confirmation answers", async () => {
    confirmMock.mockReturnValue(new Promise(vi.fn<() => void>()))

    const button = await pressTwiceWhilePending(`${ROUTES.NEWSLETTER_CONFIRM}?token=${TOKEN}`, confirmMessages.prompt.action)

    expect(button).toHaveAttribute("aria-disabled", "true")
    expect(within(button).getByRole("status", { name: spinnerMessages.loading })).toBeInTheDocument()
    expect(confirmMock).toHaveBeenCalledOnce()
  })

  it("announces progress and ignores further presses until the unsubscribe answers", async () => {
    unsubscribeMock.mockReturnValue(new Promise(vi.fn<() => void>()))

    const button = await pressTwiceWhilePending(`${ROUTES.NEWSLETTER_UNSUBSCRIBE}?token=${TOKEN}`, unsubscribeMessages.prompt.action)

    expect(button).toHaveAttribute("aria-disabled", "true")
    expect(within(button).getByRole("status", { name: spinnerMessages.loading })).toBeInTheDocument()
    expect(unsubscribeMock).toHaveBeenCalledOnce()
  })
})

describe("newsletter pages that cannot load", () => {
  it.each([
    { heading: confirmMessages.error.title, path: `${ROUTES.NEWSLETTER_CONFIRM}?token=${TOKEN}` },
    { heading: unsubscribeMessages.error.title, path: `${ROUTES.NEWSLETTER_UNSUBSCRIBE}?token=${TOKEN}` },
  ])("show the error page and change nothing: $path", async ({ heading, path }) => {
    vi.spyOn(console, "error").mockImplementation(vi.fn<() => void>())
    vi.spyOn(console, "warn").mockImplementation(vi.fn<() => void>())
    pageLoad.fails = true

    await renderNewsletter(path)

    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeVisible()
    expect(confirmMock).not.toHaveBeenCalled()
    expect(unsubscribeMock).not.toHaveBeenCalled()
  })
})
