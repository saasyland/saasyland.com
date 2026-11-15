import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

test.describe("smoke", () => {
  test("home renders on default locale without prefix", async ({ appPage, page }) => {
    await page.goto("/", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await appPage.waitForHydration(page.getByRole("main"))

    await expect(page, "should land on root URL without prefix").toHaveURL(/.*\/$/u)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
})
