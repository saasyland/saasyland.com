import { cleanup, screen, within } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { Footer } from "~/src/presentation/components/custom/footer"

import footerMessages from "~/messages/en-US/components.custom.footer.json"
import newsletterFormMessages from "~/messages/en-US/components.custom.newsletter-form.json"
import { APP_FOUNDED_YEAR, APP_GITHUB_URL, CONTACT_EMAIL } from "~/src/presentation/branding"

const renderFooter = () =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <Footer />
    </IntlProvider>,
  )

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("marketing footer", () => {
  it("links landing sections, pages, every legal document, contact, GitHub and language selection", () => {
    renderFooter()
    const footer = screen.getByRole("contentinfo")
    const hrefs = within(footer)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/#foundation",
        "/#pricing",
        "/#faq",
        "/docs",
        "/blog",
        "/auth/sign-in",
        "/privacy",
        "/terms",
        "/refunds",
        "/licence",
      ]),
    )
    expect(within(footer).getByRole("link", { name: footerMessages.links.github })).toHaveAttribute("href", APP_GITHUB_URL)
    expect(within(footer).getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
    expect(within(footer).getByRole("textbox", { name: newsletterFormMessages.label })).toHaveAttribute("type", "email")
    expect(within(footer).getByRole("link", { name: "Polski" })).toHaveAttribute("hreflang", "pl-PL")
  })

  it.each([
    { expected: String(APP_FOUNDED_YEAR), year: APP_FOUNDED_YEAR },
    { expected: `${APP_FOUNDED_YEAR}–2030`, year: 2030 },
  ])("formats the copyright for $year", ({ year, expected }) => {
    vi.spyOn(Date.prototype, "getFullYear").mockReturnValue(year)
    renderFooter()
    expect(screen.getByRole("contentinfo")).toHaveTextContent(expected)
  })
})
