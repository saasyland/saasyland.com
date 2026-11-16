import type { Locator, Page } from "@playwright/test"

import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"
import type { BasePage } from "../pages/base-page"

const SPLIT_WINDOWS = [
  { height: 900, width: 1440 },
  { height: 800, width: 1280 },
] as const

const STACKED_WINDOWS = [
  { height: 1024, width: 768 },
  { height: 844, width: 390 },
] as const

const AUTH_PAGES = [ROUTES.SIGN_IN, ROUTES.SIGN_UP, ROUTES.FORGOT_PASSWORD, ROUTES.RESET_PASSWORD, ROUTES.VERIFY_EMAIL, ROUTES.TWO_FACTOR] as const

const FITTING_PAGES = AUTH_PAGES.filter((path) => path !== ROUTES.SIGN_UP)

interface Box {
  bottom: number
  left: number
  right: number
  top: number
}

const boxOf = async (locator: Locator): Promise<Box> =>
  locator.evaluate((element) => {
    const { bottom, left, right, top } = element.getBoundingClientRect()
    return { bottom, left, right, top }
  })

const hiddenHeight = async (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight)

const banner = (page: Page): Locator => page.getByRole("banner")

const wordmark = (page: Page): Locator => banner(page).getByRole("link").first()

const backLink = (page: Page): Locator => banner(page).getByRole("link").last()

const headline = (page: Page): Locator => page.getByRole("complementary").getByRole("paragraph")

const heading = (page: Page): Locator => page.getByRole("main").getByRole("heading", { level: 1 })

const open = async (page: Page, appPage: BasePage, path: string): Promise<void> => {
  await page.goto(path)
  await appPage.waitForAppReady()
  await expect(heading(page)).toBeVisible()
}

for (const window of SPLIT_WINDOWS) {
  test.describe(`auth layout at ${String(window.width)}×${String(window.height)}`, () => {
    test.use({ viewport: window })

    test("lines the headline up under the wordmark and starts every form on the headline's line", async ({ appPage, page }) => {
      const headingTops = new Set<number>()
      for (const path of AUTH_PAGES) {
        await open(page, appPage, path)
        const [mark, header, gate, title] = await Promise.all([
          boxOf(wordmark(page)),
          boxOf(banner(page)),
          boxOf(headline(page)),
          boxOf(heading(page)),
        ])
        expect(gate.left, `${path}: the headline starts at the wordmark's left edge`).toBe(mark.left)
        expect(gate.top, `${path}: the headline starts below the header`).toBeGreaterThan(header.bottom)
        expect(title.top, `${path}: the form starts on the headline's line`).toBe(gate.top)
        headingTops.add(title.top)
      }
      expect([...headingTops], "every auth page starts its form at the same height").toHaveLength(1)
    })

    test("fits every page but sign-up in the window", async ({ appPage, page }) => {
      for (const path of FITTING_PAGES) {
        await open(page, appPage, path)
        expect(await hiddenHeight(page), `${path} does not scroll`).toBe(0)
      }
    })
  })
}

for (const window of STACKED_WINDOWS) {
  test.describe(`auth layout at ${String(window.width)}×${String(window.height)}`, () => {
    test.use({ viewport: window })

    test("puts the wordmark, the back link and the form in one column", async ({ appPage, page }) => {
      for (const path of AUTH_PAGES) {
        await open(page, appPage, path)
        await expect(page.getByRole("complementary")).toBeHidden()
        const [mark, back, title] = await Promise.all([boxOf(wordmark(page)), boxOf(backLink(page)), boxOf(heading(page))])
        expect(title.left, `${path}: the form starts at the wordmark's left edge`).toBe(mark.left)
        expect(title.right, `${path}: the form ends at the back link's right edge`).toBe(back.right)
      }
    })
  })
}
