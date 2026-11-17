import { createFormatter, createTranslator } from "use-intl"
import * as zod from "zod"

import { AFFONSO } from "../../src/integrations/affonso/affonso.constants"
import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { ENVIRONMENT } from "../../src/modules/_core/constants/api"
import { AFFILIATE_PORTAL_URL, AFFILIATE_TERMS } from "../../src/data/affiliates"
import { ROUTES } from "../../src/routes"
import affiliates from "../../messages/en-US/pages.legal.affiliates.json" with { type: "json" }
import navigation from "../../messages/en-US/navigation.legal.json" with { type: "json" }
import { readWranglerEnvironment } from "../../scripts/wrangler-config"
import { expect, test } from "../fixtures/test"

const REFERRAL_ID = "e2e-referral"

const testVariablesSchema = zod.object({ AFFONSO_PROGRAM_ID: zod.string() })

const t = createTranslator({ locale: I18N.DEFAULT_LOCALE, messages: affiliates })
const format = createFormatter({ locale: I18N.DEFAULT_LOCALE })

test("loads Affonso's script only on a visit through an affiliate link and keeps the referral", async ({ appPage, context, page }) => {
  const { vars } = await readWranglerEnvironment(ENVIRONMENT.TEST)
  const { AFFONSO_PROGRAM_ID: programId } = testVariablesSchema.parse(vars)
  const pixelRequests: string[] = []
  await page.route(AFFONSO.PIXEL_URL, async (route) => {
    pixelRequests.push(route.request().url())
    await route.fulfill({ body: `document.cookie = "${AFFONSO.REFERRAL_COOKIE}=${REFERRAL_ID}; path=/"`, contentType: "text/javascript" })
  })

  await page.goto(ROUTES.BLOG)
  await appPage.waitForAppReady()
  await expect(page.locator("script[data-affonso]")).toHaveCount(0)
  expect(pixelRequests).toEqual([])

  await page.goto(`${ROUTES.BLOG}?via=jane`)
  await appPage.waitForAppReady()
  const pixel = page.locator("script[data-affonso]")
  await expect(pixel).toHaveAttribute("data-affonso", programId)
  await expect(pixel).toHaveAttribute("data-cookie_duration", String(AFFILIATE_TERMS.COOKIE_DAYS))
  await expect.poll(async () => (await context.cookies()).find((cookie) => cookie.name === AFFONSO.REFERRAL_COOKIE)?.value).toBe(REFERRAL_ID)
  expect(pixelRequests).toEqual([AFFONSO.PIXEL_URL])
})

test("publishes the affiliate terms and links the partner portal", async ({ appPage, page }) => {
  const minimumPayout = format.number(AFFILIATE_TERMS.MINIMUM_PAYOUT, {
    currency: AFFILIATE_TERMS.PAYOUT_CURRENCY,
    maximumFractionDigits: 0,
    style: "currency",
  })

  await page.goto(ROUTES.AFFILIATES)
  await appPage.waitForAppReady()

  await expect(page.getByRole("heading", { level: 1, name: affiliates.title })).toBeVisible()
  await expect(page.getByText(t("description", { commission: AFFILIATE_TERMS.COMMISSION_PERCENT }))).toBeVisible()
  await expect(page.getByText(t("sections.payouts.body", { holdDays: AFFILIATE_TERMS.HOLD_DAYS, minimumPayout }))).toBeVisible()
  await expect(page.getByRole("link", { name: new URL(AFFILIATE_PORTAL_URL).host })).toHaveAttribute("href", AFFILIATE_PORTAL_URL)
  await expect(page.getByRole("contentinfo").getByRole("link", { name: navigation.footer.affiliates })).toHaveAttribute(
    "href",
    ROUTES.AFFILIATES,
  )
})
