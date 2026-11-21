import type { PolarEmbedCheckout } from "@polar-sh/checkout/embed"

export const CHECKOUT_OVERLAY_GRACE_MS = 10_000

type CheckoutTheme = NonNullable<NonNullable<Parameters<typeof PolarEmbedCheckout.create>[1]>["theme"]>

const CHECKOUT_THEME = { DARK: "dark", LIGHT: "light" } as const satisfies Record<string, CheckoutTheme>

interface CheckoutOutcome {
  readonly onClose: () => void
  readonly onPaid: () => void
}

interface CheckoutOverlay extends CheckoutOutcome {
  readonly onUnavailable: () => void
  readonly title: string
  readonly url: string
}

const siteTheme = (): CheckoutTheme =>
  document.documentElement.classList.contains(CHECKOUT_THEME.DARK) ? CHECKOUT_THEME.DARK : CHECKOUT_THEME.LIGHT

const checkoutFrame = (url: string): HTMLIFrameElement | undefined => {
  const { origin, pathname } = new URL(url)

  return [...document.querySelectorAll("iframe")].find(({ src }) => src.startsWith(`${origin}${pathname}?`))
}

const watchForRefusal = (frame: HTMLIFrameElement, onRefused: () => void): AbortController => {
  const watching = new AbortController()

  frame.addEventListener(
    "load",
    () => {
      const grace = globalThis.setTimeout(onRefused, CHECKOUT_OVERLAY_GRACE_MS)
      watching.signal.addEventListener("abort", () => {
        globalThis.clearTimeout(grace)
      })
    },
    { once: true, signal: watching.signal },
  )

  return watching
}

const isolate = (frame: HTMLIFrameElement): (() => void) => {
  const background = [...document.body.children].filter(
    (element): element is HTMLElement => element instanceof HTMLElement && element !== frame && !element.inert,
  )

  for (const element of background) {
    element.inert = true
  }

  return () => {
    for (const element of background) {
      element.inert = false
    }
  }
}

const follow = (checkout: PolarEmbedCheckout, frame: HTMLIFrameElement, { onClose, onPaid }: CheckoutOutcome): void => {
  const restore = isolate(frame)
  let isConfirmed = false

  const finish = (event: Event, isPaid: boolean): void => {
    event.preventDefault()
    checkout.close()
    restore()

    if (isPaid) {
      onPaid()
      return
    }

    onClose()
  }

  checkout.addEventListener("confirmed", () => {
    isConfirmed = true
  })
  checkout.addEventListener("close", (event) => {
    finish(event, isConfirmed)
  })
  checkout.addEventListener("success", (event) => {
    finish(event, true)
  })
  frame.focus()
}

const showOverlay = async ({ onUnavailable, title, url, ...outcome }: CheckoutOverlay): Promise<void> => {
  const { PolarEmbedCheckout } = await import("@polar-sh/checkout/embed")
  const opening = PolarEmbedCheckout.create(url, { theme: siteTheme() })
  const frame = checkoutFrame(url)

  if (frame === undefined) {
    throw new Error(`Polar's script showed no frame for ${url}`)
  }

  frame.title = title
  const watching = watchForRefusal(frame, onUnavailable)
  const checkout = await opening
  watching.abort()
  follow(checkout, frame, outcome)
}

export const openCheckoutOverlay = async (overlay: CheckoutOverlay): Promise<void> => {
  try {
    await showOverlay(overlay)
  } catch {
    overlay.onUnavailable()
  }
}
