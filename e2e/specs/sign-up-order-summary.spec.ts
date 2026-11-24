import type { Page } from "@playwright/test"

import { CURRENCY_FORMAT } from "../../src/modules/_core/constants/pricing"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import { TIER_PRICES } from "../../src/data/license"
import { REFUND_TERMS } from "../../src/data/refunds"
import * as ROUTES from "../../src/routes"
import { expect, test } from "../fixtures/auth"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

import pricing from "../../messages/en-US/components.custom.pricing.json" with { type: "json" }
import signUp from "../../messages/en-US/pages.auth.sign-up.json" with { type: "json" }

const COMPLETE_PRICE = new Intl.NumberFormat("en-US", CURRENCY_FORMAT).format(TIER_PRICES[LICENSE_TIER.COMPLETE])

const signUpPath = (redirect?: string): string =>
  redirect === undefined ? ROUTES.SIGN_UP : `${ROUTES.SIGN_UP}?${new URLSearchParams({ redirect }).toString()}`

const orderSummary = (page: Page) => page.getByRole("region", { name: new RegExp(`^${pricing.tiers.complete.name}`, "u") })

test.describe("sign-up order summary", () => {
  test("a tier in the redirect sums up the order with the price from TIER_PRICES in place of the description", async ({
    authPage,
    page,
  }) => {
    await page.goto(signUpPath(`${ROUTES.APP}?tier=${LICENSE_TIER.COMPLETE}`), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await authPage.waitForAppReady()

    const summary = orderSummary(page)
    await expect(summary).toBeVisible()
    await expect(summary.getByRole("heading", { level: 2 })).toContainText(pricing.tiers.complete.name)
    await expect(summary.locator(".pv:visible")).toHaveText([COMPLETE_PRICE, COMPLETE_PRICE])
    await expect(summary).toContainText(`then pay ${COMPLETE_PRICE} once with Polar.`, { useInnerText: true })
    await expect(summary.getByRole("link", { name: `Full refund within ${String(REFUND_TERMS.WITHDRAWAL_DAYS)} days` })).toHaveAttribute(
      "href",
      ROUTES.REFUNDS,
    )
    await expect(page.getByText(signUp.form.description, { exact: true })).toHaveCount(0)
  })

  test("without a tier the page keeps the description", async ({ authPage, page }) => {
    await page.goto(signUpPath(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await authPage.waitForAppReady()

    await expect(authPage.heading()).toBeVisible()
    await expect(page.getByText(signUp.form.description, { exact: true })).toBeVisible()
    await expect(orderSummary(page)).toHaveCount(0)
  })
})
