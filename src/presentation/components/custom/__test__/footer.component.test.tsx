import { cleanup, screen, within } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { getNavigationLabel, getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { FOOTER_SECTIONS } from "~/src/data/marketing"
import { FOOTER_NAVIGATION } from "~/src/data/navigation"
import { FOOTER_COLUMN } from "~/src/data/navigation.constants"

import { Footer } from "~/src/presentation/components/custom/footer"

import footerMessages from "~/messages/en-US/components.custom.footer.json"
import newsletterFormMessages from "~/messages/en-US/components.custom.newsletter-form.json"
import { APP_FOUNDED_YEAR, APP_GITHUB_URL, APP_INSTAGRAM_URL, CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const pageLabel = getNavigationLabel("en-US")

const facts = vi.hoisted(() => ({ buildYear: 0 }))

vi.mock(import("~/src/data/repository-facts"), async (importOriginal) => {
  const { REPOSITORY_FACTS } = await importOriginal()
  return { REPOSITORY_FACTS: Object.assign(facts, REPOSITORY_FACTS) }
})

const renderFooter = (path: string = ROUTES.HOME) =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <Footer />
    </IntlProvider>,
    { router: createTestRouter(path) },
  )

const currentPages = (): string[] =>
  within(screen.getByRole("contentinfo"))
    .queryAllByRole("link", { current: "page" })
    .map((link) => link.textContent)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("marketing footer", () => {
  it("links landing sections, pages, every legal document, contact and language selection", () => {
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
        "/affiliates",
        "/auth/sign-in",
        "/privacy",
        "/terms",
        "/refunds",
        "/licence",
      ]),
    )
    expect(within(footer).getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
    expect(within(footer).getByRole("textbox", { name: newsletterFormMessages.label })).toHaveAttribute("type", "email")
    expect(within(footer).getByRole("link", { name: "Polski" })).toHaveAttribute("hreflang", "pl-PL")
  })

  it.each([
    { href: APP_GITHUB_URL, name: footerMessages.links.github },
    { href: APP_INSTAGRAM_URL, name: footerMessages.links.instagram },
  ])("links $name in a new tab without a referrer", ({ href, name }) => {
    renderFooter()
    const link = within(screen.getByRole("contentinfo")).getByRole("link", { name })

    expect(link).toHaveAttribute("href", href)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noreferrer")
  })

  it.each(FOOTER_NAVIGATION)("lists the $key links under their heading in their order", ({ key, links }) => {
    renderFooter()
    const heading = screen.getByRole("heading", { level: 3, name: footerMessages.columns[key] })
    const sections = key === FOOTER_COLUMN.PRODUCT ? FOOTER_SECTIONS.map((section) => `/#${section}`) : []
    const hrefs = within(heading.parentElement ?? document.body)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))

    expect(hrefs).toStrictEqual([...sections, ...links.map(({ to }) => to)])
  })

  it("marks no landing section current on the rest of the home page", () => {
    renderFooter(ROUTES.HOME)

    expect(currentPages()).toStrictEqual([])
  })

  it.each(FOOTER_SECTIONS)("marks only the %s link current on its own section", (section) => {
    renderFooter(`${ROUTES.HOME}#${section}`)

    expect(currentPages()).toStrictEqual([footerMessages.links[section]])
  })

  it("marks the page the visitor is on", () => {
    renderFooter(ROUTES.LICENCE)
    const licence = FOOTER_NAVIGATION.flatMap(({ links }) => links).filter(({ to }) => to === ROUTES.LICENCE)

    expect(currentPages()).toStrictEqual(licence.map((link) => pageLabel(link)))
  })

  it.each([
    { expected: String(APP_FOUNDED_YEAR), year: APP_FOUNDED_YEAR },
    { expected: `${APP_FOUNDED_YEAR}–2030`, year: 2030 },
  ])("ends the copyright in the year the site was built, $year", ({ year, expected }) => {
    facts.buildYear = year
    renderFooter()
    expect(screen.getByRole("contentinfo")).toHaveTextContent(expected)
  })
})
