import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { LICENSE_MUTATION_KEYS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import type { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"

import type { openCheckoutOverlay } from "~/src/lib/checkout-overlay"

import { CheckoutButton } from "~/src/presentation/components/custom/app/checkout"

import checkoutButtonMessages from "~/messages/en-US/components.custom.checkout-button.json"
import { ROUTES } from "~/src/routes"

const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"
const CHECKOUT_URL = "#polar-checkout"
const STARTED_CHECKOUT = { checkoutId: CHECKOUT_ID, url: CHECKOUT_URL }
const BUY_CORE = "Get Core"
const BUY_AGENCY = "Get Agency"

const checkoutMock = vi.hoisted(() => vi.fn<NonNullable<typeof startCheckoutMutation.mutationFn>>())
const overlayMock = vi.hoisted(() => vi.fn<typeof openCheckoutOverlay>())

vi.mock(import("~/src/modules/license/use-cases/start-checkout"), () => ({
  startCheckoutMutation: { mutationFn: checkoutMock, mutationKey: LICENSE_MUTATION_KEYS.START_CHECKOUT },
}))
vi.mock(import("~/src/lib/checkout-overlay"), () => ({ openCheckoutOverlay: overlayMock }))

const renderButtons = async (path: string = ROUTES.APP.LICENSE) => {
  const router = createTestRouter(path)
  renderWithRouter(
    <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={getTestMessages("en-US")} timeZone={I18N.DEFAULT_TIMEZONE}>
      <CheckoutButton featured tier={LICENSE_TIER.CORE}>
        {BUY_CORE}
      </CheckoutButton>
      <CheckoutButton featured={false} tier={LICENSE_TIER.AGENCY}>
        {BUY_AGENCY}
      </CheckoutButton>
    </IntlProvider>,
    { router },
  )
  await act(() => router.load())
  return { router, user: userEvent.setup({ delay: null }) }
}

const pressBuy = async (path?: string) => {
  const rendered = await renderButtons(path)
  await rendered.user.click(screen.getByRole("button", { name: BUY_CORE }))
  return rendered
}

beforeEach(() => {
  checkoutMock.mockReset().mockResolvedValue(STARTED_CHECKOUT)
  overlayMock.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("opening Polar's checkout over the page", () => {
  it("opens the checkout the server started, under a name in the page's language, without leaving the page", async () => {
    const { router } = await pressBuy()

    await waitFor(() => {
      expect(overlayMock).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ title: checkoutButtonMessages.overlay, url: CHECKOUT_URL }),
      )
    })
    expect(router.state.location.href).toBe(ROUTES.APP.LICENSE)
  })

  it("keeps the button pending and the other tier buttons off until Polar's checkout is open", async () => {
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
    expect(screen.getByRole("button", { name: BUY_AGENCY })).toBeDisabled()
    await act(async () => {
      opened.resolve(undefined)
      await opened.promise
    })
    expect(await screen.findByRole("button", { name: BUY_CORE })).toBeEnabled()
    expect(screen.getByRole("button", { name: BUY_AGENCY })).toBeEnabled()
  })
})

describe("leaving Polar's checkout", () => {
  it("gives the focus back to the button that opened the checkout when the buyer closes it without paying", async () => {
    overlayMock.mockImplementation(({ onClose }) => {
      screen.getByRole("button", { name: BUY_AGENCY }).focus()
      onClose()
      return Promise.resolve()
    })

    const { router } = await pressBuy()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: BUY_CORE })).toHaveFocus()
    })
    expect(router.state.location.href).toBe(ROUTES.APP.LICENSE)
  })

  it("shows the payment on the success URL in place, with the tier it bought and the page the buyer came from", async () => {
    const lesson = "/courses/the-walkthrough/billing"
    overlayMock.mockImplementation(({ onPaid }) => {
      onPaid()
      return Promise.resolve()
    })

    const { router } = await pressBuy(`${ROUTES.APP.LICENSE}?redirect=${encodeURIComponent(lesson)}&tier=${LICENSE_TIER.CORE}`)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTES.APP.INDEX)
    })
    expect(router.state.location.search).toEqual({ checkoutId: CHECKOUT_ID, redirect: lesson, tier: LICENSE_TIER.CORE })
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
    globalThis.history.replaceState({}, "", "/")
  })
})
