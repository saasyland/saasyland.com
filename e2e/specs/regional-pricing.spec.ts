import { expect, test } from "../fixtures/test"

test.use({ extraHTTPHeaders: { "cf-ipcountry": "PL" } })

test("shows the regional price next to the struck-through regular price and remembers a decline", async ({ appPage, page }) => {
  await page.goto("/")
  await appPage.waitForAppReady()
  const core = page.locator("#pricing p:has(.pv)").first()
  const offer = page.getByRole("checkbox", { name: "Buying from Poland? Activate 30% off with regional pricing." })

  await expect(core).toContainText("$174")
  await expect(core.locator("s")).toBeVisible()
  await expect(offer).toBeChecked()

  await page.locator("label").filter({ has: offer }).click()
  await expect(offer).not.toBeChecked()
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

  await expect(page.locator("#pricing p:has(.pv) .pv:visible").first()).toHaveText("$174")
})

test("anchors the regional price under the hero and says under the tiers who sells, how tax works, the refund and the beta", async ({
  landingPage,
  page,
}) => {
  await landingPage.goto()

  await expect(page.getByText("lifetime updates · full refund within 14 days before first use", { exact: false })).toBeVisible()
  await expect(page.locator("#floor p:has(.pv) .pv:visible").first()).toHaveText("$174")
  const pricing = page.locator("#pricing")
  await expect(pricing.getByText("Recommended", { exact: true })).toBeVisible()
  await expect(pricing.getByText(/^Polar is the Merchant of Record/u)).toBeVisible()
  await expect(pricing.getByText(/^Prices in US dollars\. VAT is included in the EU/u)).toBeVisible()
  await expect(pricing.getByText(/^Full refund within 14 days, before you generate a project or open a paid lesson/u)).toBeVisible()
  await expect(pricing.getByText(/^The CLI is in beta/u)).toBeVisible()
  await expect(pricing.getByRole("link", { name: "Refund Policy" })).toHaveAttribute("href", "/refunds")
})
