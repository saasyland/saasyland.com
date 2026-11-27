import { QueryClient } from "@tanstack/react-query"
import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { NEWSLETTER_SUBSCRIBER_MUTATION_KEYS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { getNewsletterSubscriptionQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscription"
import type { setNewsletterSubscriptionMutation } from "~/src/modules/newsletter-subscriber/use-cases/set-newsletter-subscription"

import { NewsletterCard } from "~/src/presentation/components/custom/newsletter-card"

import labels from "~/messages/en-US/components.custom.newsletter-card.json"
import errorsMessages from "~/messages/en-US/errors.json"

type Subscription = Awaited<ReturnType<NonNullable<typeof setNewsletterSubscriptionMutation.mutationFn>>>

const setSubscription = vi.hoisted(() => vi.fn<NonNullable<typeof setNewsletterSubscriptionMutation.mutationFn>>())
const messages = getTestMessages("en-US")

vi.mock(import("~/src/modules/newsletter-subscriber/use-cases/set-newsletter-subscription"), () => ({
  setNewsletterSubscriptionMutation: { mutationFn: setSubscription, mutationKey: NEWSLETTER_SUBSCRIBER_MUTATION_KEYS.SET_SUBSCRIPTION },
}))

const unconfirmedSession = () => {
  const session = createAuthSessionFixture()
  return { ...session, user: { ...session.user, emailVerified: false } }
}

const renderCard = ({ isSubscribed = false, session = createAuthSessionFixture() } = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
  queryClient.setQueryData(getNewsletterSubscriptionQuery.queryKey, { isSubscribed })
  vi.spyOn(getCurrentSessionQuery, "queryFn").mockResolvedValue(session)
  const subscriptionRequest = vi.spyOn(getNewsletterSubscriptionQuery, "queryFn").mockResolvedValue({ isSubscribed })
  renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <NewsletterCard />
    </IntlProvider>,
    { queryClient },
  )
  return { queryClient, subscriptionRequest, user: userEvent.setup({ delay: null }) }
}

const buildLogSwitch = () => screen.getByRole("switch", { name: labels.label })

beforeEach(() => {
  setSubscription.mockReset()
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("newsletter card", () => {
  it("turns the build log on for a confirmed account in the page's language and reads the subscription again", async () => {
    setSubscription.mockResolvedValue({ isSubscribed: true })
    const { subscriptionRequest, user } = renderCard()
    expect(screen.getByRole("heading", { level: 2, name: labels.title })).toBeVisible()
    expect(buildLogSwitch()).not.toBeChecked()
    expect(buildLogSwitch()).toHaveAccessibleDescription(labels.delivery)
    subscriptionRequest.mockResolvedValue({ isSubscribed: true })

    await user.click(buildLogSwitch())

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.subscribed)
    })
    expect(setSubscription).toHaveBeenCalledExactlyOnceWith({ isSubscribed: true, locale: "en-US" }, expect.anything())
    expect(subscriptionRequest).toHaveBeenCalled()
    expect(buildLogSwitch()).toBeChecked()
    expect(buildLogSwitch()).toBeEnabled()
  })

  it("shows the requested state and holds the switch while the change is saved, then turns the build log off", async () => {
    const saved = Promise.withResolvers<Subscription>()
    setSubscription.mockReturnValue(saved.promise)
    const { subscriptionRequest, user } = renderCard({ isSubscribed: true })
    expect(buildLogSwitch()).toBeChecked()

    await user.click(buildLogSwitch())

    expect(buildLogSwitch()).not.toBeChecked()
    expect(buildLogSwitch()).toBeDisabled()
    subscriptionRequest.mockResolvedValue({ isSubscribed: false })
    await act(async () => {
      saved.resolve({ isSubscribed: false })
      await saved.promise
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.unsubscribed)
    })
    expect(buildLogSwitch()).not.toBeChecked()
    expect(buildLogSwitch()).toBeEnabled()
  })

  it("says why and keeps the saved state when the change is refused", async () => {
    setSubscription.mockRejectedValue(new AppError(ERROR_CODES.FORBIDDEN))
    const { user } = renderCard()

    await user.click(buildLogSwitch())

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.FORBIDDEN)
    })
    expect(buildLogSwitch()).not.toBeChecked()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("asks an account with an unconfirmed address to confirm it before the build log can be turned on", () => {
    renderCard({ session: unconfirmedSession() })

    expect(buildLogSwitch()).toBeDisabled()
    expect(buildLogSwitch()).not.toBeChecked()
    expect(buildLogSwitch()).toHaveAccessibleDescription(labels.unconfirmed)
  })

  it("lets an account with an unconfirmed address that is on the list turn the build log off", async () => {
    setSubscription.mockResolvedValue({ isSubscribed: false })
    const { user } = renderCard({ isSubscribed: true, session: unconfirmedSession() })
    expect(buildLogSwitch()).toHaveAccessibleDescription(labels.delivery)

    await user.click(buildLogSwitch())

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.unsubscribed)
    })
    expect(setSubscription).toHaveBeenCalledExactlyOnceWith({ isSubscribed: false, locale: "en-US" }, expect.anything())
  })
})
