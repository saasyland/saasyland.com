import { expect, test } from "../fixtures/test"

const PIXEL_URL = "https://affonso.io/js/pixel.min.js"
const TEST_PROGRAM_ID = "e2e-affonso-program"
const REFERRAL_ID = "e2e-referral"
const COOKIE_DAYS = "60"

test("loads Affonso's script only on a visit through an affiliate link and keeps the referral", async ({ appPage, context, page }) => {
  const pixelRequests: string[] = []
  await page.route(PIXEL_URL, async (route) => {
    pixelRequests.push(route.request().url())
    await route.fulfill({ body: `document.cookie = "affonso_referral=${REFERRAL_ID}; path=/"`, contentType: "text/javascript" })
  })

  await page.goto("/blog")
  await appPage.waitForAppReady()
  await expect(page.locator("script[data-affonso]")).toHaveCount(0)
  expect(pixelRequests).toEqual([])

  await page.goto("/blog?via=jane")
  await appPage.waitForAppReady()
  const pixel = page.locator("script[data-affonso]")
  await expect(pixel).toHaveAttribute("data-affonso", TEST_PROGRAM_ID)
  await expect(pixel).toHaveAttribute("data-cookie_duration", COOKIE_DAYS)
  await expect.poll(async () => (await context.cookies()).find((cookie) => cookie.name === "affonso_referral")?.value).toBe(REFERRAL_ID)
  expect(pixelRequests).toEqual([PIXEL_URL])
})

test("publishes the affiliate terms in every section", async ({ appPage, page }) => {
  await page.goto("/affiliates")
  await appPage.waitForAppReady()

  await expect(page.getByRole("heading", { level: 1, name: "Affiliate programme" })).toBeVisible()
  await expect(page.getByText("earn 40% of every sale you refer")).toBeVisible()
  await expect(page.getByText("$50")).toBeVisible()
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Affiliates" })).toHaveAttribute("href", "/affiliates")
})
