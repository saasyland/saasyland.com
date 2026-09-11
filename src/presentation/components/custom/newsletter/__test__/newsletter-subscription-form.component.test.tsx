import { QueryClient } from "@tanstack/react-query"
import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { getNewsletterSubscriptionQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscription"

import { NewsletterSubscriptionForm } from "~/src/presentation/components/custom/newsletter/newsletter-subscription-form"

type Entry = Pick<IntersectionObserverEntry, "isIntersecting">

const messages = getTestMessages("en-US")
const observe = vi.fn<(element: Element) => void>()
const disconnect = vi.fn()
const observers: ((entries: Entry[]) => void)[] = []

class TestIntersectionObserver {
  constructor(callback: (entries: Entry[]) => void) {
    observers.push(callback)
  }

  observe(element: Element): void {
    observe(element)
  }

  disconnect(): void {
    disconnect()
  }
}

const renderForm = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture())
  queryClient.setQueryData(getNewsletterSubscriptionQuery.queryKey, { isSubscribed: false })
  return renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <NewsletterSubscriptionForm />
      <a href="/blog">Read the build log</a>
    </IntlProvider>,
    { queryClient },
  )
}

const emailField = (): HTMLInputElement => screen.getByRole("textbox", { name: messages.pages.newsletter.form.label })

beforeEach(() => {
  observers.length = 0
  observe.mockReset()
  disconnect.mockReset()
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("newsletter subscription form", () => {
  it("preserves input focus through the loading placeholder and interactive form, then accepts typing", async () => {
    renderForm()
    const user = userEvent.setup()
    const placeholder = emailField()

    act(() => {
      placeholder.focus()
    })
    const loadingField = emailField()
    expect(loadingField).not.toBe(placeholder)
    expect(loadingField).toHaveAttribute("readonly")
    expect(loadingField).toHaveFocus()

    await waitFor(() => {
      expect(emailField()).not.toHaveAttribute("readonly")
    })
    expect(emailField()).not.toBe(loadingField)
    expect(emailField()).toHaveFocus()
    await user.keyboard("reader@example.com")
    expect(emailField()).toHaveValue("reader@example.com")
  })

  it("renders an inert placeholder that ignores submission until the visitor approaches it", () => {
    renderForm()

    const field = emailField()
    const form = field.closest("form")
    expect(field).toHaveAttribute("readonly")
    expect(form).not.toBeNull()
    expect(observe).toHaveBeenCalledExactlyOnceWith(form)

    if (!form) {
      throw new Error("The placeholder did not render a form")
    }
    expect(fireEvent.submit(form)).toBe(false)
    expect(field).toHaveAttribute("readonly")
  })

  it("mounts the interactive form once the placeholder scrolls into view", async () => {
    renderForm()

    observers[0]?.([{ isIntersecting: false }])
    expect(emailField()).toHaveAttribute("readonly")

    observers[0]?.([{ isIntersecting: true }])
    await waitFor(() => {
      expect(emailField()).not.toHaveAttribute("readonly")
    })
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it("preserves button focus when the visitor focuses the placeholder submit button", async () => {
    renderForm()
    const placeholder = screen.getByRole("button", { name: messages.pages.newsletter.form.button })

    act(() => {
      placeholder.focus()
    })
    await waitFor(() => {
      expect(emailField()).not.toHaveAttribute("readonly")
    })
    const button = screen.getByRole("button", { name: messages.pages.newsletter.form.button })
    expect(button).not.toBe(placeholder)
    expect(button).toHaveFocus()
  })

  it("keeps the clicked input focused and accepts typing once the form is ready", async () => {
    renderForm()
    const user = userEvent.setup()

    await user.click(emailField())
    await waitFor(() => {
      expect(emailField()).not.toHaveAttribute("readonly")
    })
    expect(emailField()).toHaveFocus()
    await user.keyboard("reader@example.com")
    expect(emailField()).toHaveValue("reader@example.com")
  })

  it("stops observing when unmounted before activation", () => {
    const { unmount } = renderForm()

    unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})

describe("newsletter focus when the visitor moves elsewhere", () => {
  it("does not move focus when the form approaches the viewport", async () => {
    renderForm()
    const link = screen.getByRole("link", { name: "Read the build log" })

    act(() => {
      link.focus()
      observers[0]?.([{ isIntersecting: true }])
    })
    await waitFor(() => {
      expect(emailField()).not.toHaveAttribute("readonly")
    })
    expect(link).toHaveFocus()
  })

  it("does not restore input focus if the visitor leaves before the form replacement commits", async () => {
    renderForm()
    const link = screen.getByRole("link", { name: "Read the build log" })

    act(() => {
      emailField().focus()
      link.focus()
    })
    await waitFor(() => {
      expect(emailField()).not.toHaveAttribute("readonly")
    })
    expect(link).toHaveFocus()
  })
})
