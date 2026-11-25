import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { AriaProvider } from "~/src/providers/aria-provider"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"
import { POLAR_ORDER_STATUS, POLAR_RECURRING_INTERVAL, POLAR_SUBSCRIPTION_STATUS } from "~/src/integrations/polar/polar.constants"
import { QUERY_STALE_TIME_MS } from "~/src/integrations/tanstack-query/query.cache"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { ORDER_INVOICE_STATUS } from "~/src/modules/order/order.constants"
import type { Order } from "~/src/modules/order/order.types"
import type { getCurrentOrderInvoice } from "~/src/modules/order/use-cases/get-current-order-invoice"
import type { getCurrentOrders } from "~/src/modules/order/use-cases/get-current-orders"
import type { Subscription } from "~/src/modules/subscription/subscription.types"
import type { getCurrentSubscriptions } from "~/src/modules/subscription/use-cases/get-current-subscriptions"

import { Route as AppRoute } from "~/src/routes/app"
import { Route as BillingRoute } from "~/src/routes/app.billing"

import authErrorsMessages from "~/messages/en-US/auth.errors.json"
import errorsMessages from "~/messages/en-US/errors.json"
import pagesBillingMessages from "~/messages/en-US/pages.billing.json"
import plPagesBillingMessages from "~/messages/pl-PL/pages.billing.json"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

const { confirmation, orders: ordersCopy, subscriptions: subscriptionsCopy } = pagesBillingMessages
const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"
const INVOICE_URL = "#invoice"
const PORTAL_URL = "#polar-portal"

const sessionRequest = vi.hoisted(() => vi.fn())
const ordersMock = vi.hoisted(() => vi.fn<() => ReturnType<typeof getCurrentOrders>>())
const subscriptionsMock = vi.hoisted(() => vi.fn<() => ReturnType<typeof getCurrentSubscriptions>>())
const invoiceMock = vi.hoisted(() => vi.fn<() => ReturnType<typeof getCurrentOrderInvoice>>())
const network = vi.hoisted(() => {
  const answer = vi.fn<typeof fetch>()
  vi.stubGlobal("fetch", answer)
  return answer
})

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})
vi.mock(import("~/src/modules/order/use-cases/get-current-orders"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, currentOrdersQuery: { ...actual.currentOrdersQuery, queryFn: ordersMock } }
})
vi.mock(import("~/src/modules/subscription/use-cases/get-current-subscriptions"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, currentSubscriptionsQuery: { ...actual.currentSubscriptionsQuery, queryFn: subscriptionsMock } }
})
vi.mock(import("~/src/modules/order/use-cases/get-current-order-invoice"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, currentOrderInvoiceQuery: (input) => ({ ...actual.currentOrderInvoiceQuery(input), queryFn: invoiceMock }) }
})

const orderOf = (overrides: Partial<Order["currentOrder"]> = {}): Order["currentOrder"] => ({
  checkoutId: JSON_NULL,
  description: "Starter kit",
  id: "ord_starter",
  invoiceNumber: "SAASY-0001",
  placedAt: new Date("2026-11-19T09:00:00.000Z"),
  refunded: { amount: 0, currency: "USD" },
  status: POLAR_ORDER_STATUS.PAID,
  total: { amount: 49, currency: "USD" },
  ...overrides,
})

const subscriptionOf = (overrides: Partial<Subscription["current"]> = {}): Subscription["current"] => ({
  cancelAtPeriodEnd: false,
  currentPeriodEnd: new Date("2026-12-16T10:00:00.000Z"),
  endedAt: JSON_NULL,
  id: "sub_team",
  price: { amount: 19, currency: "USD" },
  productName: "Team plan",
  recurringInterval: POLAR_RECURRING_INTERVAL.MONTH,
  recurringIntervalCount: 1,
  status: POLAR_SUBSCRIPTION_STATUS.ACTIVE,
  ...overrides,
})

const STARTER = orderOf()

const REFUNDED = orderOf({
  description: "Team kit",
  id: "ord_team",
  invoiceNumber: JSON_NULL,
  placedAt: new Date("2026-10-01T09:00:00.000Z"),
  refunded: { amount: 20, currency: "EUR" },
  status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED,
  total: { amount: 99, currency: "EUR" },
})

const PENDING = orderOf({ description: "Pending kit", id: "ord_pending", status: POLAR_ORDER_STATUS.PENDING })

const renderBilling = async (path: string = ROUTES.APP.BILLING, locale: SupportedLocale = "en-US") => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: QUERY_STALE_TIME_MS } },
  })
  const root = createRootRouteWithContext<RouterContext>()({
    component: () => (
      <AriaProvider>
        <Outlet />
      </AriaProvider>
    ),
  })
  Object.assign(AppRoute.options, { getParentRoute: () => root, id: "/app", path: "/app" })
  Object.assign(BillingRoute.options, { getParentRoute: () => AppRoute, id: "/billing", path: "/billing" })
  const router = createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree: root.addChildren([AppRoute.addChildren([BillingRoute])]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider formats={I18N.FORMATS} locale={locale} messages={getTestMessages(locale)} timeZone={I18N.DEFAULT_TIMEZONE}>
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { queryClient, router, user: userEvent.setup({ delay: null }) }
}

const itemOf = (name: string): HTMLElement => {
  const item = screen.getByText(name).closest("li")
  if (item === null) {
    throw new Error(`No list item holds ${name}`)
  }
  return item
}

const answerPortal = (response: Promise<Response>) => network.mockReturnValue(response)

const requestedPath = (input: Parameters<typeof fetch>[0]): string =>
  new URL(input instanceof Request ? input.url : input.toString()).pathname

const signInUnconfirmed = (): void => {
  const confirmed = createAuthSessionFixture()
  sessionRequest.mockResolvedValue({ ...confirmed, user: { ...confirmed.user, emailVerified: false } })
}

beforeEach(() => {
  sessionRequest.mockReset().mockResolvedValue(createAuthSessionFixture())
  ordersMock.mockReset().mockResolvedValue({ orders: [STARTER, REFUNDED, PENDING] })
  subscriptionsMock.mockReset().mockResolvedValue({ subscriptions: [subscriptionOf()] })
  invoiceMock.mockReset().mockResolvedValue({ status: ORDER_INVOICE_STATUS.ISSUED, url: INVOICE_URL })
  network.mockReset()
  vi.spyOn(toast, "error").mockReturnValue(0)
  vi.spyOn(toast, "info").mockReturnValue(0)
  vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {})
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      matches: false,
      media: query,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  globalThis.history.replaceState({}, "", "/")
})

describe("the billing page", () => {
  it("lists the account's orders with their amount, refund, status and invoice number, newest first", async () => {
    await renderBilling()

    expect(await screen.findByRole("heading", { level: 1, name: pagesBillingMessages.metadata.title })).toBeVisible()
    expect(screen.getByRole("heading", { level: 2, name: ordersCopy.title })).toBeVisible()
    const starter = itemOf(STARTER.description)
    expect(within(starter).getByText("Nov 19, 2026")).toBeVisible()
    expect(within(starter).getByText("SAASY-0001")).toBeVisible()
    expect(within(starter).getByText("$49.00")).toBeVisible()
    expect(within(starter).getByText(ordersCopy.status.paid)).toBeVisible()
    const refunded = itemOf(REFUNDED.description)
    expect(within(refunded).getByText("€99.00")).toBeVisible()
    expect(within(refunded).getByText(ordersCopy.refunded.replace("{amount}", "€20.00"))).toBeVisible()
    expect(within(refunded).getByText(ordersCopy.status.partially_refunded)).toBeVisible()
    expect(within(itemOf(PENDING.description)).getByText(ordersCopy.status.pending)).toBeVisible()
    expect(screen.queryByText(ordersCopy.none)).toBeNull()
  })

  it("offers the invoice of every paid order, under the invoice number or the order ID, and none for a pending order", async () => {
    await renderBilling()

    await screen.findByRole("heading", { level: 2, name: ordersCopy.title })
    expect(within(itemOf(STARTER.description)).getByRole("button", { name: "Invoice SAASY-0001" })).toBeEnabled()
    expect(within(itemOf(REFUNDED.description)).getByRole("button", { name: `Invoice ${REFUNDED.id}` })).toBeEnabled()
    expect(within(itemOf(PENDING.description)).queryByRole("button")).toBeNull()
  })

  it("opens the invoice Polar has issued", async () => {
    const { user } = await renderBilling()

    await user.click(await screen.findByRole("button", { name: "Invoice SAASY-0001" }))

    await waitFor(() => {
      expect(globalThis.location.hash).toBe(INVOICE_URL)
    })
    expect(invoiceMock).toHaveBeenCalledOnce()
  })

  it("keeps the invoice button busy while it asks for the invoice", async () => {
    const asked = Promise.withResolvers<Awaited<ReturnType<typeof getCurrentOrderInvoice>>>()
    invoiceMock.mockReturnValue(asked.promise)
    const { user } = await renderBilling()

    await user.click(await screen.findByRole("button", { name: "Invoice SAASY-0001" }))

    expect(screen.getByRole("button", { name: "Invoice SAASY-0001" })).toBeDisabled()
    await act(async () => {
      asked.resolve({ status: ORDER_INVOICE_STATUS.PENDING })
      await asked.promise
    })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Invoice SAASY-0001" })).toBeEnabled()
    })
  })

  it("says where to request an invoice Polar has not issued yet", async () => {
    invoiceMock.mockResolvedValue({ status: ORDER_INVOICE_STATUS.PENDING })
    const { user } = await renderBilling()

    await user.click(await screen.findByRole("button", { name: "Invoice SAASY-0001" }))

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(ordersCopy.invoiceNotIssued)
    })
    expect(globalThis.location.hash).toBe("")
  })

  it("says so when the invoice cannot be read", async () => {
    invoiceMock.mockRejectedValue(new Error("Polar unavailable"))
    const { user } = await renderBilling()

    await user.click(await screen.findByRole("button", { name: "Invoice SAASY-0001" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
  })

  it("lists each subscription with its price per interval and when it renews, ends or ended", async () => {
    subscriptionsMock.mockResolvedValue({
      subscriptions: [
        subscriptionOf(),
        subscriptionOf({
          cancelAtPeriodEnd: true,
          id: "sub_yearly",
          productName: "Yearly plan",
          recurringInterval: POLAR_RECURRING_INTERVAL.YEAR,
        }),
        subscriptionOf({
          endedAt: new Date("2026-05-01T10:00:00.000Z"),
          id: "sub_weekly",
          productName: "Weekly plan",
          recurringInterval: POLAR_RECURRING_INTERVAL.WEEK,
          recurringIntervalCount: 2,
          status: POLAR_SUBSCRIPTION_STATUS.CANCELED,
        }),
        subscriptionOf({ id: "sub_daily", productName: "Daily plan", recurringInterval: POLAR_RECURRING_INTERVAL.DAY }),
      ],
    })
    await renderBilling()

    expect(await screen.findByRole("heading", { level: 2, name: subscriptionsCopy.title })).toBeVisible()
    const team = itemOf("Team plan")
    expect(within(team).getByText("$19.00 a month")).toBeVisible()
    expect(within(team).getByText("Renews on Dec 16, 2026")).toBeVisible()
    expect(within(team).getByText(subscriptionsCopy.status.active)).toBeVisible()
    const yearly = itemOf("Yearly plan")
    expect(within(yearly).getByText("$19.00 a year")).toBeVisible()
    expect(within(yearly).getByText("Ends on Dec 16, 2026")).toBeVisible()
    const weekly = itemOf("Weekly plan")
    expect(within(weekly).getByText("$19.00 every 2 weeks")).toBeVisible()
    expect(within(weekly).getByText("Ended on May 1, 2026")).toBeVisible()
    expect(within(weekly).getByText(subscriptionsCopy.status.canceled)).toBeVisible()
    expect(within(itemOf("Daily plan")).getByText("$19.00 a day")).toBeVisible()
  })

  it("leaves the subscriptions out and says nothing was bought for an account without a purchase", async () => {
    ordersMock.mockResolvedValue({ orders: [] })
    subscriptionsMock.mockResolvedValue({ subscriptions: [] })
    await renderBilling()

    expect(await screen.findByText(ordersCopy.none)).toBeVisible()
    expect(screen.queryByRole("heading", { name: subscriptionsCopy.title })).toBeNull()
    expect(screen.queryByRole("button", { name: pagesBillingMessages.manage })).toBeNull()
  })

  it("speaks the reader's language", async () => {
    await renderBilling(ROUTES.APP.BILLING, "pl-PL")

    expect(await screen.findByRole("heading", { level: 1, name: plPagesBillingMessages.metadata.title })).toBeVisible()
    expect(screen.getByRole("button", { name: plPagesBillingMessages.manage })).toBeVisible()
  })
})

describe("managing billing in Polar's customer portal", () => {
  it("asks Better Auth for the signed-in account's portal and follows it there", async () => {
    answerPortal(Promise.resolve(Response.json({ redirect: true, url: PORTAL_URL })))
    const { user } = await renderBilling()

    await user.click(await screen.findByRole("button", { name: pagesBillingMessages.manage }))

    await waitFor(() => {
      expect(globalThis.location.hash).toBe(PORTAL_URL)
    })
    expect(network.mock.calls.map(([input]) => requestedPath(input))).toStrictEqual([ROUTES.API.AUTH.CUSTOMER_PORTAL])
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("keeps the button busy until the portal answers", async () => {
    const answered = Promise.withResolvers<Response>()
    answerPortal(answered.promise)
    const { user } = await renderBilling()

    await user.click(await screen.findByRole("button", { name: pagesBillingMessages.manage }))

    expect(screen.getByRole("button", { name: (name) => name.endsWith(pagesBillingMessages.manage) })).toBeDisabled()
    await act(async () => {
      answered.resolve(Response.json({ redirect: true, url: PORTAL_URL }))
      await answered.promise
    })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: pagesBillingMessages.manage })).toBeEnabled()
    })
  })

  it("says so when Polar cannot open the portal", async () => {
    answerPortal(
      Promise.resolve(Response.json({ message: "Customer portal creation failed" }, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })),
    )
    const { user } = await renderBilling()

    await user.click(await screen.findByRole("button", { name: pagesBillingMessages.manage }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(authErrorsMessages[AUTH_ERRORS.UNKNOWN_ERROR])
    })
    expect(globalThis.location.hash).toBe("")
  })

  it("waits for a confirmed email address, which the portal requires", async () => {
    signInUnconfirmed()
    await renderBilling()

    expect(await screen.findByRole("heading", { level: 2, name: ordersCopy.title })).toBeVisible()
    expect(screen.queryByRole("button", { name: pagesBillingMessages.manage })).toBeNull()
    expect(screen.getByRole("button", { name: "Invoice SAASY-0001" })).toBeEnabled()
  })
})

describe("coming back from a checkout", () => {
  it("thanks the buyer once the copies hold the paid order of the checkout", async () => {
    ordersMock.mockResolvedValue({ orders: [orderOf({ checkoutId: CHECKOUT_ID })] })
    await renderBilling(`${ROUTES.APP.BILLING}?checkoutId=${CHECKOUT_ID}`)

    expect(await screen.findByRole("heading", { name: confirmation.confirmed.title })).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent(confirmation.confirmed.body)
  })

  it("says Polar is confirming while the checkout's order is missing or unpaid", async () => {
    ordersMock.mockResolvedValue({ orders: [orderOf({ checkoutId: CHECKOUT_ID, status: POLAR_ORDER_STATUS.PENDING }), STARTER] })
    await renderBilling(`${ROUTES.APP.BILLING}?checkoutId=${CHECKOUT_ID}`)

    expect(await screen.findByRole("heading", { name: confirmation.confirming.title })).toBeVisible()
    expect(screen.queryByRole("heading", { name: confirmation.confirmed.title })).toBeNull()
  })

  it("keeps only the checkout ID of the address Polar sends the buyer back to", async () => {
    const { router } = await renderBilling(`${ROUTES.APP.BILLING}?checkoutId=${CHECKOUT_ID}&customer_session_token=secret`)

    expect(router.state.location.search).toEqual({ checkoutId: CHECKOUT_ID })
  })

  it("ignores a checkout ID that is not one", async () => {
    await renderBilling(`${ROUTES.APP.BILLING}?checkoutId=not-a-checkout`)

    expect(await screen.findByRole("heading", { level: 1, name: pagesBillingMessages.metadata.title })).toBeVisible()
    expect(screen.queryByRole("status")).toBeNull()
  })
})
