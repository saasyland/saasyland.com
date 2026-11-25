import type { ReactElement } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup } from "~/src/platform/testing/lib/skeleton"

import { POLAR_ORDER_STATUS, POLAR_RECURRING_INTERVAL, POLAR_SUBSCRIPTION_STATUS } from "~/src/integrations/polar/polar.constants"

import type { Order } from "~/src/modules/order/order.types"
import { currentOrdersQuery } from "~/src/modules/order/use-cases/get-current-orders"
import type { Subscription } from "~/src/modules/subscription/subscription.types"
import { currentSubscriptionsQuery } from "~/src/modules/subscription/use-cases/get-current-subscriptions"

import { AppPending } from "~/src/presentation/components/custom/app/app-pending"
import { AppBillingPending } from "~/src/presentation/components/custom/billing/billing-pending"

import { routeTree } from "~/src/routeTree.gen"

const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"

const SELECTORS = {
  CARD: "[data-slot=card]",
  CONFIRMATION: ".size-11.rounded-full",
  INVOICE: String.raw`.h-7.w-20`,
  MANAGE: String.raw`.h-7.w-32`,
  ROW: String.raw`.divide-y > div`,
} as const

interface Cache {
  readonly orders: readonly string[]
  readonly subscriptions: readonly string[]
}

const orderOf = (id: string): Order["currentOrder"] => ({
  checkoutId: JSON_NULL,
  description: "Starter kit",
  id,
  invoiceNumber: JSON_NULL,
  placedAt: new Date("2026-11-19T09:00:00.000Z"),
  refunded: { amount: 0, currency: "USD" },
  status: POLAR_ORDER_STATUS.PAID,
  total: { amount: 49, currency: "USD" },
})

const subscriptionOf = (id: string): Subscription["current"] => ({
  cancelAtPeriodEnd: false,
  currentPeriodEnd: new Date("2026-12-16T10:00:00.000Z"),
  endedAt: JSON_NULL,
  id,
  price: { amount: 19, currency: "USD" },
  productName: "Team plan",
  recurringInterval: POLAR_RECURRING_INTERVAL.MONTH,
  recurringIntervalCount: 1,
  status: POLAR_SUBSCRIPTION_STATUS.ACTIVE,
})

const renderAt = (ui: ReactElement, path: string, cache?: Cache) => {
  const queryClient = new QueryClient()
  if (cache !== undefined) {
    queryClient.setQueryData(currentOrdersQuery.queryKey, { orders: cache.orders.map((id) => orderOf(id)) })
    queryClient.setQueryData(currentSubscriptionsQuery.queryKey, { subscriptions: cache.subscriptions.map((id) => subscriptionOf(id)) })
  }
  return renderWithRouter(ui, { queryClient, router: createTestRouter(path, routeTree) }).container
}

afterEach(cleanup)

describe("billing skeleton", () => {
  it.each(["/app/billing", "/pl-PL/app/billing"])("is the skeleton the app layout shows at %s", (path) => {
    const page = busyMarkup(renderAt(<AppBillingPending />, path))
    cleanup()
    const container = renderAt(<AppPending />, path)

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it("draws one empty orders card before the first visit has loaded anything", () => {
    const container = renderAt(<AppBillingPending />, "/app/billing")

    expect(container.querySelectorAll(SELECTORS.CARD)).toHaveLength(1)
    expect(container.querySelectorAll(SELECTORS.ROW)).toHaveLength(0)
    expect(container.querySelector(SELECTORS.MANAGE)).toBeNull()
    expect(container.querySelector(SELECTORS.CONFIRMATION)).toBeNull()
  })

  it("mirrors the orders and subscriptions already loaded, with the portal button and an invoice button per order", () => {
    const container = renderAt(<AppBillingPending />, "/app/billing", { orders: ["a", "b"], subscriptions: ["c"] })

    expect(container.querySelectorAll(SELECTORS.CARD)).toHaveLength(2)
    expect(container.querySelectorAll(SELECTORS.ROW)).toHaveLength(3)
    expect(container.querySelectorAll(SELECTORS.INVOICE)).toHaveLength(2)
    expect(container.querySelector(SELECTORS.MANAGE)).not.toBeNull()
  })

  it("adds the confirmation panel on the way back from a checkout", () => {
    const container = renderAt(<AppBillingPending />, `/app/billing?checkoutId=${CHECKOUT_ID}`, { orders: ["a"], subscriptions: [] })

    expect(container.querySelector(SELECTORS.CONFIRMATION)).not.toBeNull()
  })
})
