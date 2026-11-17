import type { Locator, Page } from "@playwright/test"

import { CLI_CHOICES, CLI_EXEC, CLI_EXTRAS } from "../../src/data/cli"
import { MARKETING_SECTION_IDS } from "../../src/data/navigation.constants"

import landing from "../../messages/en-US/pages.landing.json" with { type: "json" }
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const { choices, coming } = landing.cli

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

    for (const [index, { flag }] of CLI_EXTRAS.entries()) {
      const option = extras(page).getByRole("button").nth(index)
      if (await option.isEnabled()) {
        const before = await optionBoxes(page)
        await press(page, option, point)
        expect(await option.getAttribute("aria-pressed")).toBe("true")
        await expect(command(page)).toContainText(flag)
        expect(await optionBoxes(page)).toStrictEqual(before)
      }
    }
  })
}

test("pressing an option the templates do not generate yet changes nothing, and every reader hears it is disabled and why", async ({
  landingPage,
  page,
}) => {
  await landingPage.goto()
  const framework = question(page, choices.framework.label)
  const next = framework.getByRole("radio", { name: choices.framework.options.next, exact: true })
  const polar = question(page, choices.billing.label).getByRole("radio", { name: choices.billing.options.polar, exact: true })
  const builder = extras(page).getByRole("button", { name: choices.extras.options["page-builder"], exact: true })
  await expect(command(page)).toContainText("--no-billing")
  const before = await command(page).textContent()
  const boxes = await optionBoxes(page)

  for (const option of [next, polar, builder]) {
    await press(page, option, PRESS_POINTS[0].point)
    await expect(option).toBeDisabled()
    await expect(option).toHaveAccessibleDescription(coming)
  }
  await expect(framework).toMatchAriaSnapshot(`
    - radiogroup "${choices.framework.label}":
      - radio "${choices.framework.options.tanstack}" [checked]
      - radio "${choices.framework.options.next}" [disabled]
      - radio "${choices.framework.options["react-router"]}" [disabled]
  `)
  await expect(builder).toHaveAttribute("aria-pressed", "false")
  await expect(command(page)).toHaveText(before ?? "")
  expect(await optionBoxes(page)).toStrictEqual(boxes)
  await expect(configurator(page).getByText(coming, { exact: true })).toBeVisible()

  await framework.getByRole("radio", { name: choices.framework.options.tanstack, exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Space")
  await expect(framework.getByRole("radio", { name: choices.framework.options.tanstack, exact: true })).toBeFocused()
  await expect(next).not.toBeChecked()
  await expect(command(page)).toHaveText(before ?? "")
})

test("the arrow keys move within a question, Space and Enter answer it, and Tab moves to the next question", async ({ landingPage, page }) => {
  await landingPage.goto()
  const betterAuth = question(page, choices.auth.label).getByRole("radio", { name: choices.auth.options["better-auth"], exact: true })
  const noAuth = question(page, choices.auth.label).getByRole("radio", { name: choices.auth.options.none, exact: true })
  const resend = question(page, choices.email.label).getByRole("radio", { name: choices.email.options.resend, exact: true })

  await betterAuth.focus()
  await page.keyboard.press("ArrowRight")
  await expect(noAuth).toBeFocused()
  await expect(betterAuth).toBeChecked()
  await page.keyboard.press("Space")
  await expect(noAuth).toBeChecked()
  await expect(command(page)).toContainText("--no-auth")

  await page.keyboard.press("ArrowLeft")
  await expect(betterAuth).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(betterAuth).toBeChecked()
  await expect(command(page)).toContainText("--auth better-auth")

  await page.keyboard.press("Tab")
  await expect(resend).toBeFocused()
  await page.keyboard.press("Shift+Tab")
  await expect(betterAuth).toBeFocused()
})

test("an option that is coming and that another answer rules out stays in place, disabled, and names both reasons to every reader", async ({
  landingPage,
  page,
}) => {
  await landingPage.goto()
  const bun = question(page, choices.runtime.label).getByRole("radio", { name: choices.runtime.options.bun, exact: true })

  await expect(bun).toBeDisabled()
  await expect(bun).toHaveAccessibleDescription(`${coming} ${choices.runtime.note}`)
  await expect(configurator(page).getByText(choices.runtime.note, { exact: true })).toBeVisible()
  await expect(configurator(page).getByText(coming, { exact: true })).toBeVisible()
})

test("an option answers the first press right after the landing page hydrates", async ({ appPage, browserName, page }) => {
  if (browserName === "chromium") {
    const devtools = await page.context().newCDPSession(page)
    await devtools.send("Emulation.setCPUThrottlingRate", { rate: HYDRATION_CPU_SLOWDOWN })
  }
  await page.goto("/", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  const noAuth = question(page, choices.auth.label).getByRole("radio", { name: choices.auth.options.none, exact: true })
  await appPage.waitForHydration(configurator(page).locator("dl").first())

  await press(page, noAuth, PRESS_POINTS[0].point)
  expect(await noAuth.getAttribute("aria-checked")).toBe("true")
  await expect(command(page)).toContainText("--no-auth")
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
  await expect(command(page)).toContainText("--no-billing")
  await expect(command(page)).not.toContainText("--api")
  await question(page, choices.auth.label).getByRole("radio", { name: choices.auth.options.none, exact: true }).click()
  await expect(command(page)).toContainText("--no-auth")
  await expect(command(page)).not.toContainText("--auth better-auth")

  await cli.getByRole("button", { name: landing.cli.copy, exact: true }).click()
  await expect(cli.getByRole("button", { name: landing.cli.copied, exact: true })).toBeVisible()
  const copied = await page.locator("html").getAttribute("data-copied-command")
  expect(copied).toContain(CLI_EXEC)
  expect(copied).toContain("--provider d1")
  expect(copied).toContain("--no-auth")
  expect(copied).toContain("--no-billing")
  expect(copied).not.toContain("--with")
  expect(copied).not.toContain("--api")
  await expect(cli.getByRole("button", { name: landing.cli.copy, exact: true })).toBeVisible()
})

for (const colorScheme of COLOR_SCHEMES) {
  test(`the configurator with disabled options meets WCAG 2.2 AA in the ${colorScheme} theme`, async ({ landingPage, page }) => {
    await page.emulateMedia({ colorScheme })
    await landingPage.goto()
    await question(page, choices.auth.label).getByRole("radio", { name: choices.auth.options.none, exact: true }).click()

    expect(await accessibilityViolations(page)).toEqual([])
  })
}
