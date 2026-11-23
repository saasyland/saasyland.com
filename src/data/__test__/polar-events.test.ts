import type { webhooks } from "@polar-sh/sdk/2026-10"
import { execFileSync } from "node:child_process"
import { describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { POLAR_API_VERSION, type PolarProduct, polarCustomer, polarOrder } from "~/src/platform/testing/lib/polar"

import { POLAR_ORDER_STATUS, POLAR_WEBHOOK_EVENT } from "~/src/integrations/polar/polar.constants"

import { POLAR_EVENTS, type PolarEventHandler } from "~/src/data/polar-events"
import * as AREA_POLAR_EVENTS from "~/src/data/polar-events.entries"
import { DEFAULT_CURRENCY_CODE } from "~/src/data/pricing"

type Areas = Readonly<Record<string, readonly PolarEventHandler[]>>

const AREAS: Areas = AREA_POLAR_EVENTS

const PRODUCT = {
  id: "product-sample",
  name: "Sample",
  price: { amount: 1000, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: JSON_NULL,
} as const satisfies PolarProduct

const ORDER = polarOrder({
  checkoutId: JSON_NULL,
  customer: polarCustomer("organization-sample", "user-sample"),
  metadata: {},
  product: PRODUCT,
  status: POLAR_ORDER_STATUS.PAID,
})

const SENT_AT = "2026-11-15T12:00:00.000Z"

const PAID: webhooks.WebhookPayload = {
  api_version: POLAR_API_VERSION,
  data: ORDER,
  timestamp: SENT_AT,
  type: POLAR_WEBHOOK_EVENT.ORDER_PAID,
}

const REFUNDED: webhooks.WebhookPayload = {
  api_version: POLAR_API_VERSION,
  data: ORDER,
  timestamp: SENT_AT,
  type: POLAR_WEBHOOK_EVENT.ORDER_REFUNDED,
}

const handler = (events: PolarEventHandler["events"]) => ({ events, handle: vi.fn<PolarEventHandler["handle"]>() })

const loadWith = async (areas: Areas) => {
  vi.resetModules()
  vi.doMock("~/src/data/polar-events.entries", () => areas)

  const dispatcher = await import("~/src/data/polar-events")

  vi.doUnmock("~/src/data/polar-events.entries")

  return dispatcher
}

describe("Polar event dispatch", () => {
  it("subscribes to every event an area handles, each once and in order", () => {
    const listed = Object.values(AREAS).flatMap((entries) => entries.flatMap(({ events }) => events))

    expect(POLAR_EVENTS).toStrictEqual(POLAR_EVENTS.toSorted())
    expect(new Set(POLAR_EVENTS).size).toBe(POLAR_EVENTS.length)
    expect(new Set(POLAR_EVENTS)).toStrictEqual(new Set(listed))
  })

  it("joins the events of several areas without repeating the ones they share", async () => {
    const { POLAR_EVENTS: events } = await loadWith({
      FIRST: [handler([POLAR_WEBHOOK_EVENT.ORDER_REFUNDED, POLAR_WEBHOOK_EVENT.ORDER_PAID])],
      SECOND: [handler([POLAR_WEBHOOK_EVENT.ORDER_PAID])],
    })

    expect(events).toStrictEqual([POLAR_WEBHOOK_EVENT.ORDER_PAID, POLAR_WEBHOOK_EVENT.ORDER_REFUNDED])
  })

  it("hands an event only to the areas that list it", async () => {
    const paidOnly = handler([POLAR_WEBHOOK_EVENT.ORDER_PAID])
    const both = handler([POLAR_WEBHOOK_EVENT.ORDER_PAID, POLAR_WEBHOOK_EVENT.ORDER_REFUNDED])
    const { handlePolarEvent } = await loadWith({ BOTH: [both], PAID_ONLY: [paidOnly] })

    await handlePolarEvent(REFUNDED)

    expect(paidOnly.handle).not.toHaveBeenCalled()
    expect(both.handle).toHaveBeenCalledExactlyOnceWith(REFUNDED)

    await handlePolarEvent(PAID)

    expect(paidOnly.handle).toHaveBeenCalledExactlyOnceWith(PAID)
    expect(both.handle).toHaveBeenLastCalledWith(PAID)
  })

  it("runs the areas' handlers in parallel and waits for all of them", async () => {
    const slow = Promise.withResolvers<undefined>()
    const first = handler([POLAR_WEBHOOK_EVENT.ORDER_PAID])
    const second = handler([POLAR_WEBHOOK_EVENT.ORDER_PAID])
    first.handle.mockReturnValue(slow.promise)
    const { handlePolarEvent } = await loadWith({ FIRST: [first], SECOND: [second] })

    const settled = vi.fn<() => void>()
    const dispatch = handlePolarEvent(PAID).then(settled)
    await Promise.resolve()

    expect(second.handle).toHaveBeenCalledExactlyOnceWith(PAID)
    expect(settled).not.toHaveBeenCalled()

    slow.resolve(undefined)
    await dispatch

    expect(settled).toHaveBeenCalledOnce()
  })

  it("waits for every area before it rejects with every failure, so the plugin answers 500 and Polar retries", async () => {
    const mirror = new Error("mirror unavailable")
    const licence = new Error("licence store unavailable")
    const slow = Promise.withResolvers<undefined>()
    const failingFirst = handler([POLAR_WEBHOOK_EVENT.ORDER_PAID])
    const failingSecond = handler([POLAR_WEBHOOK_EVENT.ORDER_PAID])
    const working = handler([POLAR_WEBHOOK_EVENT.ORDER_PAID])
    failingFirst.handle.mockRejectedValue(mirror)
    failingSecond.handle.mockRejectedValue(licence)
    working.handle.mockReturnValue(slow.promise)
    const { handlePolarEvent } = await loadWith({ FIRST: [failingFirst], SECOND: [failingSecond], WORKING: [working] })

    const rejected = vi.fn<(error: unknown) => void>()
    const dispatch = handlePolarEvent(PAID).catch(rejected)
    await Promise.resolve()
    await Promise.resolve()

    expect(rejected).not.toHaveBeenCalled()

    slow.resolve(undefined)
    await dispatch

    expect(rejected).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ errors: [mirror, licence], message: `2 of 3 handlers failed on ${POLAR_WEBHOOK_EVENT.ORDER_PAID}` }),
    )
    expect(rejected.mock.calls[0]?.[0]).toBeInstanceOf(AggregateError)
  })

  it("subscribes to nothing and accepts every event when no area handles one", async () => {
    const { POLAR_EVENTS: events, handlePolarEvent } = await loadWith({})

    expect(events).toStrictEqual([])
    await expect(handlePolarEvent(PAID)).resolves.toBeUndefined()
  })

  it("loads in Bun outside the Worker, where polar:verify reads the events", () => {
    const script = `const { POLAR_EVENTS } = await import("~/src/data/polar-events"); process.stdout.write(JSON.stringify(POLAR_EVENTS))`

    expect(JSON.parse(execFileSync("bun", ["--eval", script], { encoding: "utf8" }))).toStrictEqual(POLAR_EVENTS)
  })
})
