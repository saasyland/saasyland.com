import type { Locator, Page } from "@playwright/test"

import { CLI_CHOICES, CLI_EXEC, CLI_EXTRAS } from "../../src/data/cli"
import { MARKETING_SECTION_IDS } from "../../src/data/navigation.constants"

import landing from "../../messages/en-US/pages.landing.json" with { type: "json" }
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const { choices } = landing.cli

const PRESS_MS = 120
const EDGE_INSET_PX = 1
const HYDRATION_CPU_SLOWDOWN = 4

interface Box {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

const PRESS_POINTS = [
  { name: "centre", point: ({ height, width, x, y }: Box) => ({ x: x + width / 2, y: y + height / 2 }) },
  { name: "left edge", point: ({ height, x, y }: Box) => ({ x: x + EDGE_INSET_PX, y: y + height / 2 }) },
  { name: "right edge", point: ({ height, width, x, y }: Box) => ({ x: x + width - EDGE_INSET_PX, y: y + height / 2 }) },
] as const

type PressPoint = (typeof PRESS_POINTS)[number]["point"]

const configurator = (page: Page): Locator => page.locator(`#${MARKETING_SECTION_IDS.CLI}`)

const question = (page: Page, label: string): Locator => configurator(page).getByRole("radiogroup", { name: label, exact: true })

const extras = (page: Page): Locator => configurator(page).getByRole("toolbar", { name: choices.extras.label, exact: true })

const command = (page: Page): Locator => configurator(page).locator("code").first()

const optionBoxes = async (page: Page): Promise<string[]> =>
  configurator(page)
    .locator("dl button")
    .evaluateAll((options) =>
      options.map((option) => {
        const { height, width, x, y } = option.getBoundingClientRect()
        return `${option.textContent} ${String(x)},${String(y + window.scrollY)} ${String(width)}x${String(height)}`
      }),
    )

const press = async (page: Page, option: Locator, point: PressPoint): Promise<void> => {
  await option.evaluate((element) => {
    element.scrollIntoView({ behavior: "instant", block: "center" })
  })
  const box = await option.boundingBox()
  if (!box) {
    throw new Error("The option is not rendered")
  }
  const { x, y } = point(box)
  await page.mouse.click(x, y, { delay: PRESS_MS })
}

for (const { name, point } of PRESS_POINTS) {
  test(`every available option answers one press at its ${name}, and no press moves any option`, async ({ landingPage, page }) => {
    await landingPage.goto()

    for (const choice of CLI_CHOICES) {
      const options = question(page, choices[choice.id].label).getByRole("radio")
      await expect(options).toHaveCount(choice.options.length)
      for (const [index, { flag }] of choice.options.entries()) {
        const option = options.nth(index)
        if (await option.isEnabled()) {
          const before = await optionBoxes(page)
          await press(page, option, point)
          expect(await option.getAttribute("aria-checked")).toBe("true")
          await expect(command(page)).toContainText(flag)
          expect(await optionBoxes(page)).toStrictEqual(before)
        }
      }
    }

    await question(page, choices.billing.label).getByRole("radio").first().click()
    await question(page, choices.content.label).getByRole("radio").first().click()
    for (const [index, { flag }] of CLI_EXTRAS.entries()) {
      const option = extras(page).getByRole("button").nth(index)
      const before = await optionBoxes(page)
      await press(page, option, point)
      expect(await option.getAttribute("aria-pressed")).toBe("true")
      await expect(command(page)).toContainText(flag)
      expect(await optionBoxes(page)).toStrictEqual(before)
    }
  })
}

test("the arrow keys move within a question, Space and Enter answer it, and Tab moves to the next question", async ({ landingPage, page }) => {
  await landingPage.goto()
  const framework = question(page, choices.framework.label).getByRole("radio")
  const architecture = question(page, choices.architecture.label).getByRole("radio")

  await framework.first().focus()
  await page.keyboard.press("ArrowRight")
  await expect(framework.nth(1)).toBeFocused()
  await expect(framework.first()).toBeChecked()
  await page.keyboard.press("Space")
  await expect(framework.nth(1)).toBeChecked()
  await expect(command(page)).toContainText(CLI_CHOICES[0].options[1].flag)

  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Enter")
  await expect(framework.nth(2)).toBeChecked()
  await page.keyboard.press("ArrowLeft")
  await expect(framework.nth(1)).toBeFocused()

  await page.keyboard.press("Tab")
  await expect(architecture.first()).toBeFocused()
  await page.keyboard.press("Shift+Tab")
  await expect(framework.nth(1)).toBeFocused()
})

test("an option the other answers rule out stays in place, disabled, and names its reason to every reader", async ({ landingPage, page }) => {
  await landingPage.goto()
  const bun = question(page, choices.runtime.label).getByRole("radio", { name: choices.runtime.options.bun, exact: true })
  const note = configurator(page).getByText(choices.runtime.note, { exact: true })

  await expect(bun).toBeDisabled()
  await expect(bun).toHaveAccessibleDescription(choices.runtime.note)
  await expect(note).toBeVisible()
  const before = await optionBoxes(page)

  await question(page, choices.deployment.label).getByRole("radio", { name: choices.deployment.options.vercel, exact: true }).click()
  await expect(bun).toBeEnabled()
  await expect(bun).toHaveAccessibleDescription("")
  await expect(note).toBeVisible()
  expect(await optionBoxes(page)).toStrictEqual(before)
})

test("an option answers the first press right after the landing page hydrates", async ({ appPage, browserName, page }) => {
  if (browserName === "chromium") {
    const devtools = await page.context().newCDPSession(page)
    await devtools.send("Emulation.setCPUThrottlingRate", { rate: HYDRATION_CPU_SLOWDOWN })
  }
  await page.goto("/", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  const vercel = question(page, choices.deployment.label).getByRole("radio", { name: choices.deployment.options.vercel, exact: true })
  await appPage.waitForHydration(configurator(page).locator("dl").first())

  await press(page, vercel, PRESS_POINTS[0].point)
  expect(await vercel.getAttribute("aria-checked")).toBe("true")
  await expect(command(page)).toContainText(CLI_CHOICES[2].options[1].flag)
})

test("the command, the output and the clipboard follow every answer", async ({ landingPage, page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value: string) => {
          document.documentElement.dataset["copiedCommand"] = value
        },
      },
    })
  })
  await landingPage.goto()
  const cli = configurator(page)
  await expect(command(page)).toContainText("--provider d1")
  await expect(question(page, choices.provider.label).getByRole("radio", { name: choices.provider.options.d1, exact: true })).toBeChecked()

  await cli.getByRole("radio", { name: "npm", exact: true }).click()
  await expect(command(page)).toContainText(CLI_EXEC)
  await question(page, choices.deployment.label).getByRole("radio", { name: choices.deployment.options.vercel, exact: true }).click()
  await expect(question(page, choices.database.label).getByRole("radio", { name: choices.database.options.sqlite, exact: true })).toBeDisabled()
  await expect(command(page)).toContainText("--db postgres")
  await expect(command(page)).toContainText("--provider neon")
  await question(page, choices.architecture.label).getByRole("radio", { name: choices.architecture.options.split, exact: true }).click()
  await expect(command(page)).toContainText("--api hono")

  const store = extras(page).getByRole("button", { name: choices.extras.options.commerce, exact: true })
  await store.click()
  await expect(command(page)).toContainText("--with commerce")
  await question(page, choices.billing.label).getByRole("radio", { name: choices.billing.options.none, exact: true }).click()
  await expect(store).toBeDisabled()
  await expect(command(page)).not.toContainText("--with commerce")
  await question(page, choices.architecture.label).getByRole("radio", { name: choices.architecture.options.monolith, exact: true }).click()
  await expect(command(page)).not.toContainText("--api")

  await cli.getByRole("button", { name: landing.cli.copy, exact: true }).click()
  await expect(cli.getByRole("button", { name: landing.cli.copied, exact: true })).toBeVisible()
  const copied = await page.locator("html").getAttribute("data-copied-command")
  expect(copied).toContain(CLI_EXEC)
  expect(copied).toContain("--provider neon")
  expect(copied).not.toContain("--with commerce")
  expect(copied).not.toContain("--api")
  await expect(cli.getByRole("button", { name: landing.cli.copy, exact: true })).toBeVisible()
})

for (const colorScheme of COLOR_SCHEMES) {
  test(`the configurator with unavailable options meets WCAG 2.2 AA in the ${colorScheme} theme`, async ({ landingPage, page }) => {
    await page.emulateMedia({ colorScheme })
    await landingPage.goto()
    await question(page, choices.deployment.label).getByRole("radio", { name: choices.deployment.options.vercel, exact: true }).click()
    await question(page, choices.billing.label).getByRole("radio", { name: choices.billing.options.none, exact: true }).click()
    await extras(page).getByRole("button", { name: choices.extras.options["page-builder"], exact: true }).click()

    expect(await accessibilityViolations(page)).toEqual([])
  })
}
