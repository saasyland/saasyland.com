import type { JSX } from "react"

import { cleanup } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { SignUpOrderSummaryPending } from "~/src/presentation/components/custom/app/sign-up-order-summary"
import {
  AcceptInvitationPending,
  AuthPending,
  ForgotPasswordPending,
  ResetPasswordPending,
  SignInPending,
  SignUpPending,
  TwoFactorPending,
  VerifyEmailPending,
} from "~/src/presentation/components/custom/auth/auth-pending"

import { ROUTES } from "~/src/routes"

const TIER_SIGN_UP = `${ROUTES.SIGN_UP}?${new URLSearchParams({ redirect: `${ROUTES.APP}?${new URLSearchParams({ tier: LICENSE_TIER.COMPLETE }).toString()}` }).toString()}`

const renderAuthPending = (path: string) =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <AuthPending />
    </IntlProvider>,
    { router: createTestRouter(path) },
  )

const pageMarkupAt = (path: string, Page: () => JSX.Element): string => {
  const { container, unmount } = renderWithRouter(<Page />, { router: createTestRouter(path) })
  const markup = container.innerHTML
  unmount()
  return markup
}

afterEach(cleanup)

describe("path-aware skeletons", () => {
  it("renders only the layout chrome at /auth/callback, which has no page skeleton", () => {
    const { container } = renderAuthPending("/auth/callback")

    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it.each([
    ["/auth/sign-in", SignInPending],
    ["/pl-PL/auth/sign-up", SignUpPending],
    [TIER_SIGN_UP, SignUpPending],
    ["/auth/forgot-password", ForgotPasswordPending],
    ["/auth/reset-password", ResetPasswordPending],
    ["/auth/two-factor", TwoFactorPending],
    ["/auth/verify-email", VerifyEmailPending],
    [`/pl-PL${ROUTES.ACCEPT_INVITATION}?token=invitation-token`, AcceptInvitationPending],
  ])("renders the skeleton of the page at %s", (path, Page) => {
    const page = pageMarkupAt(path, Page)
    const { container } = renderAuthPending(path)

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })
})

describe("sign-up skeleton", () => {
  it("draws the order summary's skeleton in place of the description when the redirect carries a tier", () => {
    const summary = markupOf(<SignUpOrderSummaryPending />)
    const { container } = renderAuthPending(TIER_SIGN_UP)

    expect(busyMarkup(container)).toContain(summary)
  })

  it("draws the description's skeleton without a tier", () => {
    const summary = markupOf(<SignUpOrderSummaryPending />)
    const { container } = renderAuthPending(ROUTES.SIGN_UP)

    expect(busyMarkup(container)).not.toContain(summary)
  })
})
