import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CHECKOUT_OVERLAY_GRACE_MS, openCheckoutOverlay } from "~/src/lib/checkout-overlay"

const CHECKOUT_URL = "https://sandbox.polar.sh/checkout/polar_c_overlay"
const TITLE = "Polar checkout"

class FakeCheckout {
  readonly close = vi.fn(() => {
    document.body.querySelector(`iframe[src^="${CHECKOUT_URL}?"]`)?.remove()
  })

  private readonly events = new EventTarget()

  addEventListener(type: string, listener: (event: Event) => void): void {
    this.events.addEventListener(type, listener)
  }

  emit(type: string): Event {
    const event = new CustomEvent(type, { cancelable: true, detail: { event: type } })
    this.events.dispatchEvent(event)
    return event
  }
}

const embed = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock("@polar-sh/checkout/embed", () => ({ PolarEmbedCheckout: { create: embed.create } }))

const appendFrame = (src: string): HTMLIFrameElement => {
  const frame = document.createElement("iframe")
  frame.src = src
  document.body.replaceChildren(...document.body.children, frame)
  return frame
}

const polarOpens = () => {
  const loaded = Promise.withResolvers<FakeCheckout>()
  embed.create.mockImplementationOnce((url: string) => {
    appendFrame(`${url}?embed=true&embed_origin=${encodeURIComponent(globalThis.location.origin)}`)
    return loaded.promise
  })
  return { checkout: new FakeCheckout(), loaded }
}

const outcome = () => ({ onClose: vi.fn(), onPaid: vi.fn(), onUnavailable: vi.fn() })

const overlayFrame = (): HTMLIFrameElement | null => document.querySelector(`iframe[src^="${CHECKOUT_URL}?"]`)

const page = (): HTMLElement => {
  const main = document.createElement("main")
  main.replaceChildren(Object.assign(document.createElement("button"), { textContent: "Get Core" }))
  document.body.replaceChildren(...document.body.children, main)
  return main
}

const openOverlay = async () => {
  const { checkout, loaded } = polarOpens()
  const callbacks = outcome()
  const opening = openCheckoutOverlay({ ...callbacks, title: TITLE, url: CHECKOUT_URL })
  await vi.waitFor(() => {
    expect(overlayFrame()).not.toBeNull()
  })
  loaded.resolve(checkout)
  await opening
  return { callbacks, checkout }
}

beforeEach(() => {
  embed.create.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
  document.documentElement.classList.remove("dark")
})

describe("opening Polar's checkout over the page", () => {
  it("asks Polar for its checkout in the light theme of the site, names the frame and moves focus into it", async () => {
    await openOverlay()

    expect(embed.create).toHaveBeenCalledExactlyOnceWith(CHECKOUT_URL, { theme: "light" })
    expect(overlayFrame()).toHaveAttribute("title", TITLE)
    expect(document.activeElement).toBe(overlayFrame())
  })

  it("asks Polar for its checkout in the dark theme while the site shows its dark theme", async () => {
    document.documentElement.classList.add("dark")

    await openOverlay()

    expect(embed.create).toHaveBeenCalledExactlyOnceWith(CHECKOUT_URL, { theme: "dark" })
  })

  it("names the overlay's own frame, not another frame on the page", async () => {
    const other = appendFrame("https://sandbox.polar.sh/checkout/polar_c_other?embed=true")

    await openOverlay()

    expect(other).not.toHaveAttribute("title")
    expect(overlayFrame()).toHaveAttribute("title", TITLE)
  })

  it("makes the page behind the overlay inert while it is open and gives back only what it took", async () => {
    const main = page()
    const alreadyInert = Object.assign(document.createElement("aside"), { inert: true })
    const drawing = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    document.body.replaceChildren(...document.body.children, alreadyInert, drawing)

    const { checkout } = await openOverlay()

    expect(main.inert).toBe(true)
    expect(overlayFrame()?.inert).toBeFalsy()
    expect(drawing).not.toHaveProperty("inert")
    checkout.emit("close")
    expect(main.inert).toBe(false)
    expect(alreadyInert.inert).toBe(true)
  })
})

describe("closing Polar's checkout", () => {
  it("closes the overlay without leaving the page when the buyer closes it before paying", async () => {
    const { callbacks, checkout } = await openOverlay()

    const close = checkout.emit("close")

    expect(close.defaultPrevented).toBe(true)
    expect(checkout.close).toHaveBeenCalledOnce()
    expect(overlayFrame()).toBeNull()
    expect(callbacks.onClose).toHaveBeenCalledOnce()
    expect(callbacks.onPaid).not.toHaveBeenCalled()
  })

  it("shows the payment in place instead of following Polar's redirect when Polar reports success", async () => {
    const { callbacks, checkout } = await openOverlay()

    checkout.emit("confirmed")
    const success = checkout.emit("success")

    expect(success.defaultPrevented).toBe(true)
    expect(checkout.close).toHaveBeenCalledOnce()
    expect(callbacks.onPaid).toHaveBeenCalledOnce()
    expect(callbacks.onClose).not.toHaveBeenCalled()
  })

  it("counts a close after Polar confirmed the payment as paid, so the buyer sees the activation", async () => {
    const { callbacks, checkout } = await openOverlay()

    checkout.emit("confirmed")
    checkout.emit("close")

    expect(checkout.close).toHaveBeenCalledOnce()
    expect(callbacks.onPaid).toHaveBeenCalledOnce()
    expect(callbacks.onClose).not.toHaveBeenCalled()
  })
})

describe("when the overlay cannot open", () => {
  it("sends the buyer to Polar's checkout page when Polar's frame loads but never says the checkout is ready", async () => {
    vi.useFakeTimers()
    polarOpens()
    const callbacks = outcome()

    void openCheckoutOverlay({ ...callbacks, title: TITLE, url: CHECKOUT_URL })
    await vi.waitFor(() => {
      expect(overlayFrame()).not.toBeNull()
    })
    overlayFrame()?.dispatchEvent(new Event("load"))
    vi.advanceTimersByTime(CHECKOUT_OVERLAY_GRACE_MS - 1)
    expect(callbacks.onUnavailable).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)

    expect(callbacks.onUnavailable).toHaveBeenCalledOnce()
  })

  it("keeps the overlay when Polar says the checkout is ready within the grace period after its frame loads", async () => {
    vi.useFakeTimers()
    const { checkout, loaded } = polarOpens()
    const callbacks = outcome()

    const opening = openCheckoutOverlay({ ...callbacks, title: TITLE, url: CHECKOUT_URL })
    await vi.waitFor(() => {
      expect(overlayFrame()).not.toBeNull()
    })
    overlayFrame()?.dispatchEvent(new Event("load"))
    vi.advanceTimersByTime(CHECKOUT_OVERLAY_GRACE_MS - 1)
    loaded.resolve(checkout)
    await opening
    vi.advanceTimersByTime(CHECKOUT_OVERLAY_GRACE_MS)

    expect(callbacks.onUnavailable).not.toHaveBeenCalled()
  })

  it("ignores a later load of the frame once Polar has said the checkout is ready", async () => {
    vi.useFakeTimers()
    const { callbacks } = await openOverlay()

    overlayFrame()?.dispatchEvent(new Event("load"))
    vi.advanceTimersByTime(CHECKOUT_OVERLAY_GRACE_MS)

    expect(callbacks.onUnavailable).not.toHaveBeenCalled()
  })

  it("sends the buyer to Polar's checkout page when Polar's script shows no frame for the checkout", async () => {
    embed.create.mockReturnValueOnce(Promise.withResolvers().promise)
    const callbacks = outcome()

    await openCheckoutOverlay({ ...callbacks, title: TITLE, url: CHECKOUT_URL })

    expect(callbacks.onUnavailable).toHaveBeenCalledOnce()
  })

  it("sends the buyer to Polar's checkout page when Polar's script cannot be loaded", async () => {
    vi.resetModules()
    vi.doMock("@polar-sh/checkout/embed", () => {
      throw new TypeError("Failed to fetch dynamically imported module")
    })
    const { openCheckoutOverlay: openWithoutScript } = await import("~/src/lib/checkout-overlay")
    const callbacks = outcome()

    await openWithoutScript({ ...callbacks, title: TITLE, url: CHECKOUT_URL })

    expect(callbacks.onUnavailable).toHaveBeenCalledOnce()
    expect(embed.create).not.toHaveBeenCalled()
    vi.doUnmock("@polar-sh/checkout/embed")
  })
})
