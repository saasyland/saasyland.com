import { THEME } from "../../src/presentation/theme"
import { expect, test } from "../fixtures/test"

test("documentation theme selector changes and persists the selected theme", async ({ appPage, baseURL, page }) => {
  await page.context().addCookies([{ name: THEME.COOKIE_NAME, url: baseURL ?? "http://127.0.0.1:3000", value: "dark" }])
  await page.goto("/docs/getting-started")
  await appPage.waitForAppReady()
  await page.getByRole("button", { name: /Dark/u }).click()
  await page.getByRole("option", { name: "Light", exact: true }).click()
  await expect(page.locator("html")).toHaveClass(/\blight\b/u)
  await expect.poll(async () => (await page.context().cookies()).find(({ name }) => name === THEME.COOKIE_NAME)?.value).toBe("light")
  await page.reload()
  await appPage.waitForAppReady()
  await expect(page.getByRole("button", { name: /Light/u })).toBeVisible()
  await expect(page.locator("html")).toHaveClass(/\blight\b/u)
})
