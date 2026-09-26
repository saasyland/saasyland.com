import { expect, test } from "../fixtures/test"

test.use({ extraHTTPHeaders: { "cf-ipcountry": "PL" } })

test("shows the regional price next to the struck-through regular price and remembers a decline", async ({ appPage, page }) => {
  await page.goto("/")
  await appPage.waitForAppReady()
  const core = page.locator("#pricing p:has(.pv)").first()
  const offer = page.getByRole("checkbox", { name: "Buying from Poland? Activate 30% off with regional pricing." })

  await expect(core).toContainText("$174.30")
  await expect(core.locator("s")).toBeVisible()
  await expect(offer).toBeChecked()

  await offer.uncheck()
  await expect(core.locator(".pv:visible")).toHaveText("$249")
  await expect(core.locator("s")).toBeHidden()

  await page.reload()
  await expect(offer).not.toBeChecked()
  await expect(core.locator(".pv:visible")).toHaveText("$249")
})

test("keeps regional pricing on a client-side visit to the landing page", async ({ appPage, page }) => {
  await page.goto("/docs")
  await appPage.waitForAppReady()
  await page.locator('a[href="/"]:visible').first().click()

  await expect(page.locator("#pricing p:has(.pv) .pv:visible").first()).toHaveText("$174.30")
})
