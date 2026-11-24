import { createFormatter, createTranslator } from "use-intl"
import * as zod from "zod"

import { AFFONSO } from "../../src/integrations/affonso/affonso.constants"
import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { ENVIRONMENT } from "../../src/modules/_core/constants/api"
import { AFFILIATE_PORTAL_URL, AFFILIATE_PROGRAM, AFFILIATE_TERMS } from "../../src/data/affiliates"
import { CLI_GENERATION_VALUES } from "../../src/data/cli"
import { FEATURE_STATUS } from "../../src/data/navigation.constants"
import { CONTACT_EMAIL } from "../../src/presentation/branding"
import * as ROUTES from "../../src/routes"
import affiliates from "../../messages/en-US/pages.legal.affiliates.json" with { type: "json" }
import navigation from "../../messages/en-US/navigation.affiliates.json" with { type: "json" }
import { readWranglerEnvironment } from "../../scripts/wrangler-config"
import { expect, test } from "../fixtures/test"

const REFERRAL_ID = "e2e-referral"
const AFFONSO_HOST = new URL(AFFONSO.PIXEL_URL).hostname
const PORTAL_HOST = new URL(AFFILIATE_PORTAL_URL).host

const PROGRAM_EXPECTATIONS = {
  [FEATURE_STATUS.ARRIVING]: { affonsoRequests: [], portalLinks: 0, referral: undefined, scripts: 0 },
  [FEATURE_STATUS.AVAILABLE]: { affonsoRequests: [AFFONSO.PIXEL_URL], portalLinks: 1, referral: REFERRAL_ID, scripts: 1 },
}

const expected = PROGRAM_EXPECTATIONS[AFFILIATE_PROGRAM]

const testVariablesSchema = zod.object({ AFFONSO_PROGRAM_ID: zod.string() })

const t = createTranslator({ locale: I18N.DEFAULT_LOCALE, messages: affiliates })
const format = createFormatter({ locale: I18N.DEFAULT_LOCALE })

const isAffonso = (url: URL): boolean => url.hostname === AFFONSO_HOST || url.hostname.endsWith(`.${AFFONSO_HOST}`)

test("loads Affonso's script only on a visit through an affiliate link while the programme is open", async ({ appPage, context, page }) => {
  const { vars } = await readWranglerEnvironment(ENVIRONMENT.TEST)
  const { AFFONSO_PROGRAM_ID: programId } = testVariablesSchema.parse(vars)
  const pixel = page.locator(`script[data-affonso="${programId}"][data-cookie_duration="${String(AFFILIATE_TERMS.COOKIE_DAYS)}"]`)
  const affonsoRequests: string[] = []
  await page.route(isAffonso, async (route) => {
    affonsoRequests.push(route.request().url())
    await route.fulfill({ body: `document.cookie = "${AFFONSO.REFERRAL_COOKIE}=${REFERRAL_ID}; path=/"`, contentType: "text/javascript" })
  })

  await page.goto(ROUTES.BLOG)
  await appPage.waitForAppReady()
  await expect(page.locator("script[data-affonso]")).toHaveCount(0)
  expect(affonsoRequests).toEqual([])

  await page.goto(`${ROUTES.BLOG}?via=jane`)
  await appPage.waitForAppReady()
  await expect(pixel).toHaveCount(expected.scripts)
  await page.waitForLoadState("networkidle")
  await expect.poll(async () => (await context.cookies()).find((cookie) => cookie.name === AFFONSO.REFERRAL_COOKIE)?.value).toBe(expected.referral)
  await expect(page.locator("script[data-affonso]")).toHaveCount(expected.scripts)
  expect(affonsoRequests).toEqual(expected.affonsoRequests)
})

test("publishes the affiliate terms and says how to join while the programme is in its current status", async ({ appPage, page }) => {
  const minimumPayout = format.number(AFFILIATE_TERMS.MINIMUM_PAYOUT, {
    currency: AFFILIATE_TERMS.PAYOUT_CURRENCY,
    maximumFractionDigits: 0,
    style: "currency",
  })
  const values = {
    ...CLI_GENERATION_VALUES,
    commission: AFFILIATE_TERMS.COMMISSION_PERCENT,
    email: CONTACT_EMAIL,
    portal: PORTAL_HOST,
    program: AFFILIATE_PROGRAM,
  }

  await page.goto(ROUTES.AFFILIATES)
  await appPage.waitForAppReady()

  await expect(page.getByRole("heading", { level: 1, name: affiliates.title })).toBeVisible()
  await expect(page.getByText(t("description", values))).toBeVisible()
  await expect(page.getByText(t("sections.payouts.body", { holdDays: AFFILIATE_TERMS.HOLD_DAYS, minimumPayout }))).toBeVisible()
  await expect(page.getByText(t.markup("sections.join.body", { ...values, link: (chunks) => chunks }))).toBeVisible()
  await expect(page.locator(`a[href="${AFFILIATE_PORTAL_URL}"]`)).toHaveCount(expected.portalLinks)
  await expect(page.getByRole("contentinfo").getByRole("link", { name: navigation.footer.affiliates })).toHaveAttribute(
    "href",
    ROUTES.AFFILIATES,
  )
})
