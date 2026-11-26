import type { Locator } from "@playwright/test"
import * as zod from "zod"

import { CURRENCY_FORMAT } from "../../src/modules/_core/constants/pricing"
import { LICENSE_TIERS } from "../../src/modules/license/license.constants"
import { TIER_PRICES } from "../../src/data/license"
import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"

const STRUCTURED_DATA = /<script type="application\/ld\+json">(?<json>[^<]+)<\/script>/gu

const productGraphSchema = zod.object({
  "@graph": zod.array(zod.object({ "@type": zod.literal("Product"), offers: zod.object({ price: zod.number(), priceCurrency: zod.string() }) })),
})

const expectRegionalPrice = (scope: Locator, price: string): Promise<void> =>
  expect(scope.locator(".pv.ppp-text:visible").first()).toHaveCSS("content", JSON.stringify(price), { pseudo: "before" })

test.use({ extraHTTPHeaders: { "cf-ipcountry": "PL" } })

test("the prerendered landing page describes each tier as a product at its regular price in the currency the page shows", async ({
  request,
}) => {
  const html = await (await request.get(ROUTES.HOME)).text()
  const products = Array.from(html.matchAll(STRUCTURED_DATA), ({ groups }) => productGraphSchema.safeParse(JSON.parse(groups?.["json"] ?? "")))
    .flatMap(({ data }) => data?.["@graph"] ?? [])

  expect(products.map(({ offers }) => [offers.price, offers.priceCurrency])).toStrictEqual(
    LICENSE_TIERS.map((tier) => [TIER_PRICES[tier], CURRENCY_FORMAT.currency]),
  )
})

test("shows the regional price next to the struck-through regular price and remembers a decline", async ({ appPage, page }) => {
  await page.goto("/")
  await appPage.waitForAppReady()
  const core = page.locator("#pricing p:has(.pv)").first()
  const offer = page.getByRole("checkbox", { name: "Buying from Poland? Activate 30% off with regional pricing." })

  await expectRegionalPrice(core, "$174")
  await expect(core.locator("s")).toBeVisible()
  await expect(core.locator("s")).toHaveText("")
  await expect(core).toMatchAriaSnapshot("- paragraph: $174 Regular price $249 one-time Save 30%")
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

  await expectRegionalPrice(page.locator("#pricing p:has(.pv)").first(), "$174")
})

test("anchors the regional price under the hero and says under the tiers who sells, how tax works, the refund and the beta", async ({
  landingPage,
  page,
}) => {
  await landingPage.goto()

  await expect(page.getByText("lifetime updates · full refund within 14 days before first use", { exact: false })).toBeVisible()
  await expectRegionalPrice(page.locator("#floor p:has(.pv)").first(), "$174")
  const pricing = page.locator("#pricing")
  await expect(pricing.getByText("Recommended", { exact: true })).toBeVisible()
  await expect(pricing.getByText(/^Polar is the Merchant of Record/u)).toBeVisible()
  await expect(pricing.getByText(/^Prices in US dollars\. VAT is included in the EU/u)).toBeVisible()
  await expect(pricing.getByText(/^Full refund within 14 days, before you generate a project or open a paid lesson/u)).toBeVisible()
  await expect(pricing.getByText(/^The CLI is in beta/u)).toBeVisible()
  await expect(pricing.getByRole("link", { name: "Refund Policy" })).toHaveAttribute("href", "/refunds")
})
