import { screen, within } from "@testing-library/react"
import { createTranslator } from "use-intl"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { Route as WithdrawalRoute } from "~/src/routes/_site._marketing.withdrawal"

import { REFUND_TERMS } from "~/src/data/refunds"

import pageMessages from "~/messages/en-US/pages.withdrawal.json"
import { ROUTES } from "~/src/routes"

const t = createTranslator({ locale: "en-US", messages: pageMessages })

const renderPage = (locale: (typeof I18N.SUPPORTED_LOCALES)[number]) => {
  const Page = WithdrawalRoute.options.component
  if (Page === undefined) {
    throw new Error("The withdrawal route has no page component")
  }
  return renderWithRouter(
    <IntlProvider formats={I18N.FORMATS} locale={locale} messages={getTestMessages(locale)} timeZone={I18N.DEFAULT_TIMEZONE}>
      <Page />
    </IntlProvider>,
  )
}

describe("withdrawal page", () => {
  it("explains when the right applies and offers the online withdrawal statement, signed out", () => {
    renderPage("en-US")

    expect(screen.getByRole("heading", { level: 1, name: pageMessages.title })).toBeTruthy()
    const refunds = screen.getByRole("link", { name: "Refund Policy" })
    expect(refunds).toHaveAttribute("href", ROUTES.REFUNDS)
    expect(refunds.closest("p")?.textContent).toBe(t.markup("rights", { days: REFUND_TERMS.WITHDRAWAL_DAYS, refunds: (chunks) => chunks }))
    expect(screen.getByRole("link", { name: "licence page" })).toHaveAttribute("href", ROUTES.APP.LICENSE)
    const statement = screen.getByRole("heading", { level: 2, name: pageMessages.form.title }).closest<HTMLElement>("[data-slot=card]")
    if (statement === null) {
      throw new Error("The statement is outside a card")
    }
    expect(within(statement).getByRole("button", { name: pageMessages.form.confirm })).toBeTruthy()
  })

  it.each(I18N.SUPPORTED_LOCALES)("renders completely in %s", (locale) => {
    const { container } = renderPage(locale)

    expect(container).not.toHaveTextContent("pages.withdrawal")
    expect(screen.getAllByRole("textbox")).toHaveLength(3)
  })
})
