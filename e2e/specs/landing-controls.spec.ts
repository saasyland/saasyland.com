import type { Locator, Page } from "@playwright/test"

import { CLI_PACKAGE_SPEC, PACKAGE_MANAGER } from "../../src/data/cli"
import { MARKETING_SECTION_IDS } from "../../src/data/navigation.constants"

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

const MID_SLIDE_MS = 48
const PAUSE_AHEAD_MS = 1000

const glowOf = (item: Locator): Locator => item.locator(":scope > [aria-hidden]")

const tierOf = (page: Page, name: string): Locator =>
  page.locator(`#${MARKETING_SECTION_IDS.PRICING} .grid > div`).filter({ has: page.getByRole("heading", { exact: true, level: 3, name }) })

const otherOptionOf = (page: Page, title: string): Locator =>
  page
    .locator(`#${MARKETING_SECTION_IDS.PRICING}`)
    .getByRole("heading", { exact: true, name: "Other options" })
    .locator("..")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { exact: true, level: 4, name: title }) })

const comparisonRowOf = (page: Page, label: string): Locator =>
  page
    .locator("dl", { has: page.getByText("What you pay", { exact: true }) })
    .locator(":scope > div")
    .filter({ has: page.getByText(label, { exact: true }) })

const SLIDES = [
  { from: (page: Page) => tierOf(page, "Complete"), name: "back over the featured tier", to: (page: Page) => tierOf(page, "Core") },
  { from: (page: Page) => tierOf(page, "Core"), name: "forward over the tiers", to: (page: Page) => tierOf(page, "Complete") },
  {
    from: (page: Page) => otherOptionOf(page, "The engineer is reachable."),
    name: "back over the other options",
    to: (page: Page) => otherOptionOf(page, "Start from the MIT source."),
  },
  { from: (page: Page) => comparisonRowOf(page, "What you pay"), name: "down the comparison", to: (page: Page) => comparisonRowOf(page, "Code coverage") },
] as const

const layersUnderGlow = async (leaving: Locator, glow: Locator): Promise<{ content: number; glow: number; item: number }> => {
  const item = await leaving.elementHandle()
  return glow.evaluate((slidingGlow, leavingItem) => {
    const glowBox = slidingGlow.getBoundingClientRect()
    const [probe] = [...leavingItem.children]
      .filter((child) => !child.hasAttribute("aria-hidden"))
      .map((child) => {
        const box = child.getBoundingClientRect()
        const left = Math.max(box.left, glowBox.left)
        const right = Math.min(box.right, glowBox.right)
        const top = Math.max(box.top, glowBox.top)
        const bottom = Math.min(box.bottom, glowBox.bottom)
        return { area: Math.max(0, right - left) * Math.max(0, bottom - top), x: (left + right) / 2, y: (top + bottom) / 2 }
      })
      .filter(({ area }) => area > 0)
      .toSorted((first, second) => second.area - first.area)
    if (!probe) {
      return { content: -1, glow: -1, item: -1 }
    }
    slidingGlow.style.pointerEvents = "auto"
    const stack = document.elementsFromPoint(probe.x, probe.y)
    slidingGlow.style.removeProperty("pointer-events")
    return {
      content: stack.findIndex((element) => element !== leavingItem && leavingItem.contains(element) && !element.hasAttribute("aria-hidden")),
      glow: stack.indexOf(slidingGlow),
      item: stack.indexOf(leavingItem),
    }
  }, item)
}

test("hero install command follows the selected package manager", async ({ landingPage, page }) => {
  await landingPage.goto()
  const hero = page.locator("#floor")
  await hero.getByRole("radio", { name: "pnpm", exact: true }).click()
  const command = hero.getByRole("button", { name: "Copy the install command" }).locator("..").locator("code")
  await expect(command).toContainText(`${PACKAGE_MANAGER.PNPM.exec} ${CLI_PACKAGE_SPEC}`)
  await expect(hero.getByRole("radio", { name: "pnpm", exact: true })).toBeChecked()
})

test("foundation shares its hover highlight and clears it when leaving", async ({ landingPage, page }) => {
  await landingPage.goto()
  const cells = page.locator("#foundation .grid.gap-px > div")
  await cells.nth(0).hover()
  await expect(glowOf(cells.nth(0))).toHaveCSS("opacity", "1")
  await cells.nth(1).hover()
  await expect(glowOf(cells.nth(1))).toHaveCSS("opacity", "1")
  await expect(glowOf(cells.nth(0))).toHaveCount(0)
  await page.locator("#foundation h2").hover()
  await expect(glowOf(cells.nth(1))).toHaveCount(0)
})

test("other options share a rounded hover highlight and clear it when leaving", async ({ landingPage, page }) => {
  await landingPage.goto()
  const heading = page.locator(`#${MARKETING_SECTION_IDS.PRICING}`).getByRole("heading", { exact: true, name: "Other options" })
  const options = heading.locator("..").getByRole("listitem")
  await options.nth(0).hover()
  await expect(glowOf(options.nth(0))).toHaveCSS("opacity", "1")
  await options.nth(1).hover()
  await expect(glowOf(options.nth(1))).toHaveCSS("opacity", "1")
  await expect(glowOf(options.nth(0))).toHaveCount(0)
  const radius = await options.nth(1).evaluate((option) => getComputedStyle(option).borderTopLeftRadius)
  await expect(glowOf(options.nth(1))).toHaveCSS("border-top-left-radius", radius)
  await heading.hover()
  await expect(glowOf(options.nth(1))).toHaveCount(0)
})

for (const slide of SLIDES) {
  test(`the hover highlight slides ${slide.name} over every background and under every text`, async ({ landingPage, page }) => {
    await page.clock.install()
    await landingPage.goto()
    const leaving = slide.from(page)
    const entering = slide.to(page)
    await leaving.hover()
    await expect(glowOf(leaving)).toHaveCSS("opacity", "1")
    const target = await entering.boundingBox()
    if (!target) {
      throw new Error("The item the highlight slides to has no box")
    }
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + PAUSE_AHEAD_MS)
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2)
    await page.clock.runFor(MID_SLIDE_MS)

    const { content, glow, item } = await layersUnderGlow(leaving, glowOf(entering))
    expect(content).toBeGreaterThanOrEqual(0)
    expect(content).toBeLessThan(glow)
    expect(glow).toBeLessThan(item)
  })
}

test("mobile menu closes with Escape and after choosing the pricing section", async ({ landingPage, page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await landingPage.goto()
  const menu = page.getByRole("dialog", { name: "Menu", exact: true })
  await page.getByRole("button", { name: "Open menu", exact: true }).click()
  await expect(menu).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()
  await page.getByRole("button", { name: "Open menu", exact: true }).click()
  await menu.getByRole("link", { name: "Pricing", exact: true }).click()
  await expect(menu).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`#${MARKETING_SECTION_IDS.PRICING}$`, "u"))
  await expect(page.locator(`#${MARKETING_SECTION_IDS.PRICING}`)).toBeInViewport()
})

test("back to top appears past half a screen and returns smoothly to the page heading", async ({ landingPage, page }) => {
  await landingPage.goto()
  const backToTop = page.getByRole("button", { name: "Back to top", exact: true })
  await expect(backToTop).toBeHidden()

  await scrollScreens(page, 0.25)
  await expect(backToTop).toBeHidden()
  await scrollScreens(page, 0.6)
  await expect(backToTop).toBeVisible()
  await scrollScreens(page, 0.25)
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
