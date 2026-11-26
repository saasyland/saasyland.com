import type { Locator, Page } from "@playwright/test"

import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { localizePathname } from "../../src/integrations/use-intl/i18n.paths"
import { MARKETING_SECTION_IDS } from "../../src/data/navigation.constants"
import { CONTACT_EMAIL } from "../../src/presentation/branding"
import * as ROUTES from "../../src/routes"
import { FOOTER_PHONE_WIDTHS } from "../data/viewports"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"

const PHONE_HEIGHT = 844
const MINIMUM_TARGET = 24

const SECTION_LINKS = [
  { name: "Foundation", section: MARKETING_SECTION_IDS.FOUNDATION },
  { name: "Pricing", section: MARKETING_SECTION_IDS.PRICING },
  { name: "FAQ", section: MARKETING_SECTION_IDS.FAQ },
] as const

interface Layout {
  readonly closest: { readonly gap: number; readonly pair: string }
  readonly overflow: number
}

const visit = async (page: Page, path: string): Promise<void> => {
  await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await new BasePage(page).waitForAppReady()
}

const footer = (page: Page): Locator => page.getByRole("contentinfo")

const layoutOf = async (page: Page): Promise<Layout> =>
  footer(page).evaluate((element) => {
    const content = element.firstElementChild
    if (!(content instanceof HTMLElement)) {
      throw new TypeError("The footer has no content box")
    }
    const { paddingLeft, paddingRight } = getComputedStyle(content)
    const bounds = content.getBoundingClientRect()
    const left = bounds.left + Number.parseFloat(paddingLeft)
    const right = bounds.right - Number.parseFloat(paddingRight)
    const links = [...element.querySelectorAll("a, summary")]
      .filter((link) => link.checkVisibility())
      .map((link) => ({ box: link.getBoundingClientRect(), text: link.textContent.trim() }))

    let closest = { gap: Number.POSITIVE_INFINITY, pair: "" }
    for (const first of links) {
      for (const second of links) {
        const sameRow = first.box.top < second.box.bottom && second.box.top < first.box.bottom
        const gap = second.box.left - first.box.right
        if (first !== second && sameRow && second.box.left >= first.box.left && gap < closest.gap) {
          closest = { gap, pair: `${first.text} | ${second.text}` }
        }
      }
    }
    const overflow = Math.max(...links.map(({ box }) => Math.max(left - box.left, box.right - right)))

    return { closest, overflow }
  })

for (const locale of I18N.SUPPORTED_LOCALES) {
  test(`${locale}: no two footer links touch, and none leaves the footer, on a phone`, async ({ page }) => {
    for (const width of FOOTER_PHONE_WIDTHS) {
      await page.setViewportSize({ height: PHONE_HEIGHT, width })
      await visit(page, localizePathname({ locale, pathname: ROUTES.LICENCE }))
      const { closest, overflow } = await layoutOf(page)

      expect(closest.gap, `${String(width)} px: ${closest.pair}`).toBeGreaterThan(0)
      expect(overflow, `${String(width)} px`).toBeLessThanOrEqual(0)
    }
  })
}

test("marks no landing section current on the rest of the home page", async ({ page }) => {
  await visit(page, ROUTES.HOME)

  for (const { name } of SECTION_LINKS) {
    await expect(footer(page).getByRole("link", { exact: true, name })).not.toHaveAttribute("aria-current")
  }
})

for (const { name, section } of SECTION_LINKS) {
  test(`marks only ${name} current on the ${section} section`, async ({ page }) => {
    await visit(page, `${ROUTES.HOME}#${section}`)

    await expect(footer(page).getByRole("link", { exact: true, name })).toHaveAttribute("aria-current", "page")
    for (const other of SECTION_LINKS.filter((link) => link.section !== section)) {
      await expect(footer(page).getByRole("link", { exact: true, name: other.name })).not.toHaveAttribute("aria-current")
    }
  })
}

test("gives the contact address a tap target of at least 24 by 24 pixels", async ({ page }) => {
  await page.setViewportSize({ height: PHONE_HEIGHT, width: FOOTER_PHONE_WIDTHS[1] })
  await visit(page, ROUTES.LICENCE)
  const email = await footer(page).getByRole("link", { exact: true, name: CONTACT_EMAIL }).boundingBox()

  expect(email?.width).toBeGreaterThanOrEqual(MINIMUM_TARGET)
  expect(email?.height).toBeGreaterThanOrEqual(MINIMUM_TARGET)
})
