import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import type { startCheckoutMutation } from "~/src/modules/order/use-cases/start-checkout"

import type { openCheckoutOverlay } from "~/src/lib/checkout-overlay"

import { CheckoutButton } from "~/src/presentation/components/custom/billing/checkout-button"

import checkoutButtonMessages from "~/messages/en-US/components.custom.checkout-button.json"
import errorsMessages from "~/messages/en-US/errors.json"
import * as ROUTES from "~/src/routes"

const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"
const CHECKOUT_URL = "#polar-checkout"
const STARTER_KIT = "00000000-0000-4000-8000-0000000000a1"
const TEAM_PLAN = "00000000-0000-4000-8000-0000000000a2"
const BUY_STARTER = "Buy the starter kit"
const BUY_TEAM = "Subscribe to the team plan"
const OFFER_PATH = `${ROUTES.APP}?plan=team`

const checkoutMock = vi.hoisted(() => vi.fn<NonNullable<typeof startCheckoutMutation.mutationFn>>())
const overlayMock = vi.hoisted(() => vi.fn<typeof openCheckoutOverlay>())

vi.mock(import("~/src/modules/order/use-cases/start-checkout"), () => ({
  startCheckoutMutation: { mutationFn: checkoutMock, mutationKey: ORDER_MUTATION_KEYS.START_CHECKOUT },
}))
vi.mock(import("~/src/lib/checkout-overlay"), () => ({ openCheckoutOverlay: overlayMock }))

const renderOffer = async () => {
  const router = createTestRouter(OFFER_PATH)
  renderWithRouter(
    <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={getTestMessages("en-US")} timeZone={I18N.DEFAULT_TIMEZONE}>
      <CheckoutButton productId={STARTER_KIT}>{BUY_STARTER}</CheckoutButton>
      <CheckoutButton productId={TEAM_PLAN}>{BUY_TEAM}</CheckoutButton>
    </IntlProvider>,
    { router },
  )
  await act(() => router.load())
  return { router, user: userEvent.setup({ delay: null }) }
}

const pressBuy = async () => {
  const rendered = await renderOffer()
  await rendered.user.click(screen.getByRole("button", { name: BUY_STARTER }))
  return rendered
}

beforeEach(() => {
  checkoutMock.mockReset().mockResolvedValue({ checkoutId: CHECKOUT_ID, url: CHECKOUT_URL })
  overlayMock.mockReset().mockResolvedValue(undefined)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
  globalThis.history.replaceState({}, "", "/")
})

describe("buying a Polar product", () => {
  it("starts the checkout of its product in the page's language, back to the offer and on to the billing page", async () => {
    await pressBuy()

    expect(checkoutMock).toHaveBeenCalledExactlyOnceWith(
      { locale: "en-US", productId: STARTER_KIT, returnPath: OFFER_PATH, successPath: ROUTES.APP_BILLING },
      expect.anything(),
    )
    await waitFor(() => {
      expect(overlayMock).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ title: checkoutButtonMessages.overlay, url: CHECKOUT_URL }),
      )
    })
  })

  it("keeps the button pending and the other offers off until Polar's checkout is open", async () => {
    const opened = Promise.withResolvers<undefined>()
    overlayMock.mockReturnValue(opened.promise)

    await pressBuy()

    await waitFor(() => {
      expect(overlayMock).toHaveBeenCalledOnce()
    })
    expect(screen.getByRole("button", { name: (name) => name.endsWith(checkoutButtonMessages.pending) })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
    expect(screen.getByRole("button", { name: BUY_TEAM })).toBeDisabled()
    await act(async () => {
      opened.resolve(undefined)
      await opened.promise
    })
    expect(await screen.findByRole("button", { name: BUY_STARTER })).toBeEnabled()
    expect(screen.getByRole("button", { name: BUY_TEAM })).toBeEnabled()
  })

  it("says so when the checkout cannot start", async () => {
    checkoutMock.mockRejectedValue(new Error("Checkout unavailable"))

    await pressBuy()

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(overlayMock).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: BUY_STARTER })).toBeEnabled()
  })
})

describe("leaving Polar's checkout", () => {
  it("gives the focus back to the button when the buyer closes the checkout without paying", async () => {
    overlayMock.mockImplementation(({ onClose }) => {
      screen.getByRole("button", { name: BUY_TEAM }).focus()
      onClose()
      return Promise.resolve()
    })

    const { router } = await pressBuy()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: BUY_STARTER })).toHaveFocus()
    })
    expect(router.state.location.href).toBe(OFFER_PATH)
  })

  it("shows the payment on the billing page once the buyer has paid", async () => {
    overlayMock.mockImplementation(({ onPaid }) => {
      onPaid()
      return Promise.resolve()
    })

    const { router } = await pressBuy()

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTES.APP_BILLING)
    })
    expect(router.state.location.search).toEqual({ checkoutId: CHECKOUT_ID })
  })

  it("goes to Polar's checkout page when the checkout cannot open over the page", async () => {
    overlayMock.mockImplementation(({ onUnavailable }) => {
      onUnavailable()
      return Promise.resolve()
    })

    await pressBuy()

    await waitFor(() => {
      expect(globalThis.location.hash).toBe(CHECKOUT_URL)
    })
  })
})
