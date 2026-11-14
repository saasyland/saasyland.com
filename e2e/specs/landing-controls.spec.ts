import type { Page } from "@playwright/test"

import { expect, test } from "../fixtures/test"

const scrollY = async (page: Page): Promise<number> => page.evaluate(() => window.scrollY)

const hasScrolledAndStopped = async (page: Page): Promise<boolean> =>
  page.evaluate(
    async () =>
      new Promise<boolean>((resolve) => {
        const start = window.scrollY
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(start > 0 && window.scrollY === start)
          })
        })
      }),
  )

const scrollScreens = async (page: Page, screens: number): Promise<void> => {
  await page.evaluate((count) => window.scrollTo({ behavior: "instant", top: window.innerHeight * count }), screens)
}

test("CLI keeps valid choices, command output and clipboard contents in sync", async ({ appPage, page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (value: string) => { document.documentElement.dataset["copiedCommand"] = value } },
    })
  })
  await page.goto("/")
  await appPage.waitForAppReady()
  const cli = page.locator("#cli")
  const command = cli.locator("code").first()
  await expect(command).toContainText("--provider d1")
  await expect(cli.getByRole("button", { name: "Cloudflare D1", exact: true })).toHaveAttribute("aria-pressed", "true")

  await cli.getByRole("radio", { name: "npm", exact: true }).click()
  await expect(command).toContainText("npx saasyland@latest")
  await cli.getByRole("button", { name: "Vercel", exact: true }).click()
  await expect(cli.getByRole("button", { name: "SQLite", exact: true })).toBeDisabled()
  await expect(command).toContainText("--db postgres")
  await expect(command).toContainText("--provider neon")
  await cli.getByRole("button", { name: "Split API", exact: true }).click()
  await expect(command).toContainText("--api hono")

  const store = cli.getByRole("button", { name: "Store with sample products", exact: true })
  await store.click()
  await expect(command).toContainText("--with commerce")
  const billing = cli.locator("dl > div").filter({ has: page.getByText("Billing", { exact: true }) })
  await billing.getByRole("button", { name: "None", exact: true }).click()
  await expect(store).toBeDisabled()
  await expect(command).not.toContainText("--with commerce")
  await cli.getByRole("button", { name: "Monolith", exact: true }).click()
  await expect(command).not.toContainText("--api")

  await cli.getByRole("button", { name: "Copy the command", exact: true }).click()
  await expect(cli.getByRole("button", { name: "Copied", exact: true })).toBeVisible()
  const copied = await page.locator("html").getAttribute("data-copied-command")
  expect(copied).toContain("npx saasyland@latest")
  expect(copied).toContain("--provider neon")
  expect(copied).not.toContain("--with commerce")
  expect(copied).not.toContain("--api")
  await expect(cli.getByRole("button", { name: "Copy the command", exact: true })).toBeVisible()
})

test("hero install command follows the selected package manager", async ({ landingPage, page }) => {
  await landingPage.goto()
  const hero = page.locator("#floor")
  await hero.getByRole("radio", { name: "pnpm", exact: true }).click()
  await expect(hero.locator("code")).toContainText("pnpm dlx saasyland@latest")
  await expect(hero.getByRole("radio", { name: "pnpm", exact: true })).toBeChecked()
})

test("foundation shares its hover highlight and clears it when leaving", async ({ landingPage, page }) => {
  await landingPage.goto()
  const cells = page.locator("#foundation .grid.gap-px > div")
  await cells.nth(0).hover()
  await expect(cells.nth(0)).toHaveCSS("z-index", "10")
  await cells.nth(1).hover()
  await expect(cells.nth(1)).toHaveCSS("z-index", "10")
  await expect(cells.nth(0)).toHaveCSS("z-index", "auto")
  await page.locator("#foundation h2").hover()
  await expect(cells.nth(1)).toHaveCSS("z-index", "auto")
})

test("mobile menu closes with Escape and after choosing a section", async ({ landingPage, page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await landingPage.goto()
  await page.getByRole("button", { name: "Open menu", exact: true }).click()
  await expect(page.locator("#mobile-menu")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.locator("#mobile-menu")).not.toBeVisible()
  await page.getByRole("button", { name: "Open menu", exact: true }).click()
  await page.locator("#mobile-menu").getByRole("link", { name: "Foundation", exact: true }).click()
  await expect(page.locator("#mobile-menu")).not.toBeVisible()
  await expect(page).toHaveURL(/#foundation$/u)
})

test("back to top appears past the first screen and returns smoothly to the page heading", async ({ landingPage, page }) => {
  await landingPage.goto()
  const backToTop = page.getByRole("button", { name: "Back to top", exact: true })
  await expect(backToTop).toBeHidden()

  await scrollScreens(page, 0.5)
  await expect(backToTop).toBeHidden()
  await scrollScreens(page, 3)
  await expect(backToTop).toBeVisible()

  await backToTop.click()
  expect(await scrollY(page)).toBeGreaterThan(0)
  await expect.poll(async () => scrollY(page)).toBe(0)
  await expect(landingPage.heroHeading()).toBeFocused()
  await expect(landingPage.heroHeading()).toHaveCSS("outline-style", "none")
  await expect(backToTop).toBeHidden()
})

test("back to top jumps straight to the top for reduced motion", async ({ landingPage, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await landingPage.goto()
  await scrollScreens(page, 3)
  const backToTop = page.getByRole("button", { name: "Back to top", exact: true })

  await backToTop.click()
  expect(await scrollY(page)).toBe(0)
})

test("the logo on the landing page scrolls back to the top and drops the section hash", async ({ landingPage, page }) => {
  await landingPage.goto()
  const logo = landingPage.navigation().getByRole("link", { name: "SaaSy Land", exact: true })

  await scrollScreens(page, 3)
  await logo.click()
  await expect.poll(async () => scrollY(page)).toBe(0)
  await expect(page).toHaveURL("/")

  await landingPage.navigation().getByRole("link", { name: "Pricing", exact: true }).click()
  await expect(page).toHaveURL(/#pricing$/u)
  await expect.poll(async () => hasScrolledAndStopped(page)).toBe(true)
  const entries = await page.evaluate(() => history.length)
  await logo.click()
  await expect.poll(async () => scrollY(page)).toBe(0)
  await expect(page).toHaveURL("/")
  expect(await page.evaluate(() => history.length)).toBe(entries)
})
