import { cleanup, screen, waitFor, within } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { getNavigationLabel, getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { SESSION_ATTRIBUTE } from "~/src/modules/session/session.rewrite"

import { FOOTER_SECTIONS } from "~/src/data/marketing"
import { FOOTER_NAVIGATION } from "~/src/data/navigation"
import { FOOTER_COLUMN } from "~/src/data/navigation.constants"

import { Footer } from "~/src/presentation/components/custom/footer"

import footerMessages from "~/messages/en-US/components.custom.footer.json"
import newsletterFormMessages from "~/messages/en-US/components.custom.newsletter-form.json"
import navigationAuthMessages from "~/messages/en-US/navigation.auth.json"
import { APP_FOUNDED_YEAR, APP_GITHUB_URL, APP_INSTAGRAM_URL, CONTACT_EMAIL } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

const pageLabel = getNavigationLabel("en-US")

const facts = vi.hoisted(() => ({ buildYear: 0 }))

const sessionRequest = vi.hoisted(() => vi.fn())

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})

vi.mock(import("~/src/lib/repository-facts"), async (importOriginal) => {
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

const footerLink = (href: string): HTMLElement | undefined =>
  within(screen.getByRole("contentinfo"))
    .getAllByRole("link")
    .find((link) => link.getAttribute("href") === href)

describe("the footer for a signed-in visitor", () => {
  afterEach(() => {
    document.documentElement.removeAttribute(SESSION_ATTRIBUTE)
  })

  it.each([
    { role: ROLE_CODES.CUSTOMER, workspace: ROUTES.APP },
    { role: ROLE_CODES.ADMIN, workspace: ROUTES.ADMIN },
  ])("leads a $role from its account link to $workspace instead of sign-in", async ({ role, workspace }) => {
    document.documentElement.setAttribute(SESSION_ATTRIBUTE, "")
    sessionRequest.mockResolvedValue(createAuthSessionFixture({ role }))
    renderFooter()

    await waitFor(() => {
      expect(footerLink(workspace)).toHaveTextContent(`${navigationAuthMessages.footer.signIn}${navigationAuthMessages.footer.account}`)
    })
    expect(footerLink(ROUTES.SIGN_IN)).toBeUndefined()
  })

  it("keeps the same link while the session loads, so a press that starts on it still lands on it", async () => {
    document.documentElement.setAttribute(SESSION_ATTRIBUTE, "")
    const session = Promise.withResolvers<ReturnType<typeof createAuthSessionFixture>>()
    sessionRequest.mockReturnValue(session.promise)
    renderFooter()
    const signIn = footerLink(ROUTES.SIGN_IN)
    session.resolve(createAuthSessionFixture())

    await waitFor(() => {
      expect(footerLink(ROUTES.APP)).toBe(signIn)
    })
  })
})
