import { screen } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { SignUpConsent } from "~/src/presentation/components/custom/sign-up-consent"

import { ROUTES } from "~/src/routes"

it.each([
  ["Terms of Service", ROUTES.TERMS],
  ["Privacy Policy", ROUTES.PRIVACY],
] as const)("links %s to %s", (name, href) => {
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
      <SignUpConsent />
    </IntlProvider>,
    { router: createTestRouter() },
  )

  expect(screen.getByRole("link", { name })).toHaveAttribute("href", href)
})
