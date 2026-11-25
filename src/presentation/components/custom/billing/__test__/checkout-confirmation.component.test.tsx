import { QueryClient, defaultScheduler, notifyManager } from "@tanstack/react-query"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import type { Order } from "~/src/modules/order/order.types"
import { currentOrdersQuery } from "~/src/modules/order/use-cases/get-current-orders"
import { SUBSCRIPTION_QUERY_KEYS } from "~/src/modules/subscription/subscription.constants"

import {
  CHECKOUT_CONFIRMATION_POLL_MS,
  CHECKOUT_CONFIRMATION_TIMEOUT_MS,
  CheckoutConfirmation,
} from "~/src/presentation/components/custom/billing/checkout-confirmation"

import pagesBillingMessages from "~/messages/en-US/pages.billing.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"

const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"
const { confirmation } = pagesBillingMessages

const ordersMock = vi.hoisted(() => vi.fn<() => Promise<Order["currentOrders"]>>())

vi.mock(import("~/src/modules/order/use-cases/get-current-orders"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, currentOrdersQuery: { ...actual.currentOrdersQuery, queryFn: ordersMock } }
})

const paidOrder: Order["currentOrder"] = {
  checkoutId: CHECKOUT_ID,
  description: "Starter kit",
  id: "ord_starter",
  invoiceNumber: JSON_NULL,
  placedAt: new Date("2026-11-19T09:00:00.000Z"),
  refunded: { amount: 0, currency: "USD" },
  status: POLAR_ORDER_STATUS.PAID,
  total: { amount: 49, currency: "USD" },
}

const renderConfirmation = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(currentOrdersQuery.queryKey, { orders: [] })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <CheckoutConfirmation checkoutId={CHECKOUT_ID} />
    </IntlProvider>,
    { queryClient, router: createTestRouter("/app/billing") },
  )
  return { invalidate }
}

const advance = async (milliseconds: number): Promise<void> => {
  await act(() => vi.advanceTimersByTimeAsync(milliseconds))
}

beforeEach(() => {
  vi.useFakeTimers()
  notifyManager.setScheduler(queueMicrotask)
  ordersMock.mockReset().mockResolvedValue({ orders: [] })
})

afterEach(() => {
  cleanup()
  notifyManager.setScheduler(defaultScheduler)
  vi.useRealTimers()
})

describe("checkout confirmation", () => {
  it("asks for the orders until the checkout's paid order arrives, then thanks the buyer and refreshes the subscriptions", async () => {
    const { invalidate } = renderConfirmation()

    expect(screen.getByRole("heading", { name: confirmation.confirming.title })).toBeVisible()
    await advance(CHECKOUT_CONFIRMATION_POLL_MS)
    expect(ordersMock).toHaveBeenCalledTimes(1)
    ordersMock.mockResolvedValue({ orders: [paidOrder] })
    await advance(CHECKOUT_CONFIRMATION_POLL_MS)

    expect(screen.getByRole("heading", { name: confirmation.confirmed.title })).toBeVisible()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SUBSCRIPTION_QUERY_KEYS.ALL })
    await advance(CHECKOUT_CONFIRMATION_POLL_MS * 3)
    expect(ordersMock).toHaveBeenCalledTimes(2)
  })

  it("stops asking after the timeout, names the checkout for support and asks again on request", async () => {
    renderConfirmation()

    await advance(CHECKOUT_CONFIRMATION_TIMEOUT_MS)

    expect(screen.getByRole("heading", { name: confirmation.delayed.title })).toBeVisible()
    expect(screen.getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
    expect(screen.getByText(CHECKOUT_ID)).toBeVisible()
    const calls = ordersMock.mock.calls.length
    await advance(CHECKOUT_CONFIRMATION_POLL_MS * 3)
    expect(ordersMock).toHaveBeenCalledTimes(calls)

    ordersMock.mockResolvedValue({ orders: [paidOrder] })
    fireEvent.click(screen.getByRole("button", { name: confirmation.delayed.retry }))
    await advance(0)

    expect(screen.getByRole("heading", { name: confirmation.confirmed.title })).toBeVisible()
  })
})
