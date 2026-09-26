import type { ReactElement } from "react"

import { cleanup, render } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import {
  AuthPending,
  ForgotPasswordPending,
  ResetPasswordPending,
  SignInPending,
  SignUpPending,
  TwoFactorPending,
  VerifyEmailPending,
} from "~/src/presentation/components/custom/auth/auth-pending"
import { BlogIndexPending, BlogPending, BlogPostPending } from "~/src/presentation/components/custom/blog/blog-pending"
import { DocsPending } from "~/src/presentation/components/custom/docs-pending"
import {
  HomePending,
  LegalPending,
  MarketingPending,
  NewsletterPending,
  PremiumPending,
} from "~/src/presentation/components/custom/marketing-pending"

const markupOf = (ui: ReactElement) => {
  const { container, unmount } = render(ui)
  const markup = container.innerHTML
  unmount()
  return markup
}

const busyMarkup = (container: HTMLElement) => container.querySelector('[aria-busy="true"]')?.outerHTML

const StubObserver = vi.fn(function stubObserver(this: Pick<IntersectionObserver, "disconnect" | "observe">) {
  this.disconnect = vi.fn<() => void>()
  this.observe = vi.fn<(element: Element) => void>()
})

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", StubObserver)
  vi.stubGlobal("ResizeObserver", StubObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it("marks the docs skeleton as a single busy region", () => {
  const { container } = render(<DocsPending />)

  expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
})

describe("path-aware skeletons", () => {
  it.each([
    ["/auth/callback", AuthPending],
    ["/newsletter", MarketingPending],
  ])("renders only the layout chrome at %s, which has no page skeleton", (path, Layout) => {
    const { container } = renderWithRouter(
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
        <Layout />
      </IntlProvider>,
      { router: createTestRouter(path) },
    )

    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it.each([
    ["/auth/sign-in", AuthPending, SignInPending],
    ["/pl-PL/auth/sign-up", AuthPending, SignUpPending],
    ["/auth/forgot-password", AuthPending, ForgotPasswordPending],
    ["/auth/reset-password", AuthPending, ResetPasswordPending],
    ["/auth/two-factor", AuthPending, TwoFactorPending],
    ["/auth/verify-email", AuthPending, VerifyEmailPending],
    ["/", MarketingPending, HomePending],
    ["/pl-PL", MarketingPending, HomePending],
    ["/terms", MarketingPending, LegalPending],
    ["/de-DE/newsletter/confirm", MarketingPending, NewsletterPending],
    ["/newsletter/unsubscribe", MarketingPending, NewsletterPending],
    ["/premium", MarketingPending, PremiumPending],
    ["/blog", BlogPending, BlogIndexPending],
    ["/ja-JP/blog", BlogPending, BlogIndexPending],
    ["/blog/saasy-land-release", BlogPending, BlogPostPending],
  ])("renders the skeleton of the page at %s", (path, Layout, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
        <Layout />
      </IntlProvider>,
      { router: createTestRouter(path) },
    )

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })
})
