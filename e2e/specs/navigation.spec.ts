import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"

const CLIENT_SCRIPT = /\/assets\/[\w.-]+\.js$/u

test.describe("server rendering and client navigation", () => {
  test(`${ROUTES.HOME} renders its heading before JavaScript runs`, async ({ pageWithoutJavaScript }) => {
    await pageWithoutJavaScript.goto(ROUTES.HOME)
    await expect(pageWithoutJavaScript.getByRole("heading", { level: 1 })).toBeVisible()
  })
})

test.describe("a page that is still loading", () => {
  test("keeps the position a visitor scrolled to before it hydrated", async ({ appPage, page }) => {
    const scripts = Promise.withResolvers<void>()
    await page.route(CLIENT_SCRIPT, async (route) => {
      await scripts.promise
      await route.continue()
    })
    await page.goto(ROUTES.HOME, { waitUntil: "commit" })
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await page.evaluate(() => {
      document.body.style.minHeight = `${window.innerHeight * 4}px`
      window.scrollTo({ behavior: "instant", top: window.innerHeight * 3 })
    })
    const scrolled = await page.evaluate(() => window.scrollY)
    expect(scrolled).toBeGreaterThan(0)

    scripts.resolve()
    await appPage.waitForAppReady()

    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled)
  })
})
