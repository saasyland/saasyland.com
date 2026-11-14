import { cleanup } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

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

const renderAuthPending = (path: string) =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <AuthPending />
    </IntlProvider>,
    { router: createTestRouter(path) },
  )

afterEach(cleanup)

describe("path-aware skeletons", () => {
  it("renders only the layout chrome at /auth/callback, which has no page skeleton", () => {
    const { container } = renderAuthPending("/auth/callback")

    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it.each([
    ["/auth/sign-in", SignInPending],
    ["/pl-PL/auth/sign-up", SignUpPending],
    ["/auth/forgot-password", ForgotPasswordPending],
    ["/auth/reset-password", ResetPasswordPending],
    ["/auth/two-factor", TwoFactorPending],
    ["/auth/verify-email", VerifyEmailPending],
  ])("renders the skeleton of the page at %s", (path, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderAuthPending(path)

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })
})
