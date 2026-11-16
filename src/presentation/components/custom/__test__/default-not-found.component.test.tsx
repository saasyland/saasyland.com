import { screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { CTA_CLASSES } from "~/src/data/cta"

import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"

import commonMessages from "~/messages/pl-PL/common.json"
import notFoundMessages from "~/messages/pl-PL/errors.not-found.json"

it("titles the page, explains it and offers the way home as the primary call to action, in the visitor's locale", () => {
  renderWithRouter(
    <IntlProvider locale="pl-PL" messages={getTestMessages("pl-PL")}>
      <DefaultNotFound />
    </IntlProvider>,
  )

  expect(screen.getByRole("heading", { level: 1, name: notFoundMessages.metadata.title })).toHaveClass("text-headline-peak")
  expect(screen.getByText(notFoundMessages.metadata.description)).toBeVisible()
  const home = screen.getByRole("link", { name: commonMessages.backHome })
  expect(home).toHaveAttribute("href", "/")
  expect(home).toHaveClass(CTA_CLASSES.PRIMARY)
})
