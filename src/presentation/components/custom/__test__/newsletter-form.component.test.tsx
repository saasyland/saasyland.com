import { QueryClient } from "@tanstack/react-query"
import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import {
  NEWSLETTER_SUBSCRIBER_MUTATION_KEYS,
  SUBSCRIPTION_RESULT,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { getNewsletterSubscriptionQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscription"
import type { subscribeToNewsletterMutation } from "~/src/modules/newsletter-subscriber/use-cases/subscribe-to-newsletter"

import { NewsletterForm } from "~/src/presentation/components/custom/newsletter-form"

import authValidationMessages from "~/messages/en-US/auth.validations.json"
import formMessages from "~/messages/en-US/components.custom.newsletter-form.json"
import spinnerMessages from "~/messages/en-US/components.shadcn.spinner.json"
import errorsMessages from "~/messages/en-US/errors.json"

const subscribeMock = vi.hoisted(() => vi.fn<NonNullable<typeof subscribeToNewsletterMutation.mutationFn>>())
const messages = getTestMessages("en-US")
const TEST_EMAIL = "reader@example.com"

vi.mock(import("~/src/modules/newsletter-subscriber/use-cases/subscribe-to-newsletter"), () => ({
  subscribeToNewsletterMutation: {
    mutationFn: subscribeMock,
    mutationKey: NEWSLETTER_SUBSCRIBER_MUTATION_KEYS.SUBSCRIBE,
  },
}))

const renderForm = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture())
  queryClient.setQueryData(getNewsletterSubscriptionQuery.queryKey, { isSubscribed: false })
  renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <NewsletterForm />
    </IntlProvider>,
    { queryClient },
  )
  return { queryClient, user: userEvent.setup() }
}

beforeEach(() => {
  subscribeMock.mockReset()
  subscribeMock.mockResolvedValue({ status: SUBSCRIPTION_RESULT.CONFIRMATION_SENT })
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("newsletter form", () => {
  it("invalidates the newsletter subscription after success without invalidating the session", async () => {
    const { queryClient, user } = renderForm()
    await user.type(screen.getByRole("textbox", { name: formMessages.label }), TEST_EMAIL)
    await user.click(screen.getByRole("button", { name: formMessages.button }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(formMessages.confirmationSent)
    })
    expect(subscribeMock).toHaveBeenCalledExactlyOnceWith({ email: TEST_EMAIL, locale: "en-US" }, expect.anything())
    expect(queryClient.getQueryState(getNewsletterSubscriptionQuery.queryKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(getCurrentSessionQuery.queryKey)?.isInvalidated).toBe(false)
    expect(screen.getByRole("textbox", { name: formMessages.label })).toHaveValue("")
  })

  it("preserves both caches and the entered email when subscribing fails", async () => {
    subscribeMock.mockRejectedValue(new Error("Email delivery failed"))
    const { queryClient, user } = renderForm()
    await user.type(screen.getByRole("textbox", { name: formMessages.label }), TEST_EMAIL)
    await user.click(screen.getByRole("button", { name: formMessages.button }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(queryClient.getQueryState(getNewsletterSubscriptionQuery.queryKey)?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(getCurrentSessionQuery.queryKey)?.isInvalidated).toBe(false)
    expect(screen.getByRole("textbox", { name: formMessages.label })).toHaveValue(TEST_EMAIL)
  })

  it("locks the form and shows progress until the subscription request finishes", async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof subscribeMock>>>()
    subscribeMock.mockReturnValueOnce(pending.promise)
    const { user } = renderForm()
    const field = screen.getByRole("textbox", { name: formMessages.label })
    const submit = screen.getByRole("button", { name: formMessages.button })
    await user.type(field, TEST_EMAIL)
    await user.click(submit)

    expect(submit).toHaveTextContent(formMessages.submitting)
    expect(submit).toHaveAttribute("aria-disabled", "true")
    expect(within(submit).getByRole("status", { name: spinnerMessages.loading })).toBeInTheDocument()
    expect(field).toBeDisabled()
    await user.click(submit)
    expect(subscribeMock).toHaveBeenCalledOnce()

    await act(async () => {
      pending.resolve({ status: SUBSCRIPTION_RESULT.CONFIRMATION_SENT })
      await pending.promise
    })
    await waitFor(() => {
      expect(submit).toHaveTextContent(formMessages.button)
    })
    expect(submit).not.toHaveAttribute("aria-disabled")
    expect(within(submit).queryByRole("status")).not.toBeInTheDocument()
    expect(field).toBeEnabled()
    expect(toast.success).toHaveBeenCalledWith(formMessages.confirmationSent)
  })

  it("shows the localized validation error without subscribing when the email is invalid", async () => {
    const { user } = renderForm()
    const field = screen.getByRole("textbox", { name: formMessages.label })
    await user.type(field, "not-an-email")
    await user.click(screen.getByRole("button", { name: formMessages.button }))

    expect(await screen.findByRole("alert")).toHaveTextContent(authValidationMessages.emailInvalid)
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(subscribeMock).not.toHaveBeenCalled()
  })
})
