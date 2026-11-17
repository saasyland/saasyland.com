import { screen } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { stubMarketingObservers } from "~/src/presentation/components/custom/__test__/fixtures/marketing-pending"
import { DocsPending } from "~/src/presentation/components/custom/docs-pending"

import navigationMessages from "~/messages/en-US/components.custom.navigation.json"

stubMarketingObservers()

const renderDocsPending = () =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <DocsPending />
    </IntlProvider>,
  )

it("marks the docs skeleton as a single busy region", () => {
  const { container } = renderDocsPending()

  expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
})

it("keeps the site header above the skeleton, since the docs layout renders it", () => {
  const { container } = renderDocsPending()

  expect(container.firstElementChild).toBe(screen.getByRole("banner"))
  expect(screen.getByRole("navigation", { name: navigationMessages.ariaLabel })).toBeVisible()
})
