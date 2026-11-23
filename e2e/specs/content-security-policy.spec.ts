import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_POLAR } from "../data/polar-settings"
import { expect, test } from "../fixtures/auth"
import { checkoutOverlay, payInCheckoutOverlay } from "../fixtures/polar-checkout"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

import { documentPolicy } from "../../src/lib/content-security-policy"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import * as ROUTES from "../../src/routes"

const [admin, customer] = TEST_ACCOUNTS
const POLICY_HEADER = "content-security-policy"
const PRERENDERED_PAGES = [ROUTES.HOME, `${ROUTES.DOCS}/features/security`, `${ROUTES.BLOG}/ai-coding-agents-repository-readiness`]
const RENDERED_PAGES = [ROUTES.SIGN_IN, ROUTES.COURSES]
const NONCE = /'nonce-(?<nonce>[\da-f]{32})'/u
const SCRIPT_TAG = /<script\b[^>]*>/giu
const MODULE_PRELOAD = /<link\b[^>]*\brel="modulepreload"[^>]*>/giu
const DATA_BLOCK = /\btype="application\/ld\+json"/u
const ROUTER_NONCE = /<meta property="csp-nonce" content="(?<nonce>[\da-f]{32})"\s*\/>/u

const policyNonce = (policy: string | undefined): string => NONCE.exec(policy ?? "")?.groups?.["nonce"] ?? ""

test.describe("content security policy", () => {
  for (const path of [...PRERENDERED_PAGES, ...RENDERED_PAGES]) {
    test(`${path} gets a new nonce with every response, in its header and on every script`, async ({ appPage, page, request }) => {
      const first = await request.get(path)
      const second = await request.get(path)
      const nonce = policyNonce(first.headers()[POLICY_HEADER])
      const html = await first.text()

      expect(first.headers()[POLICY_HEADER]).toBe(documentPolicy(nonce, TEST_POLAR.POLAR_SERVER))
      expect(policyNonce(second.headers()[POLICY_HEADER])).not.toBe(nonce)
      expect(
        Array.from(html.matchAll(SCRIPT_TAG), ([tag]) => tag).filter((tag) => !DATA_BLOCK.test(tag) && !tag.includes(` nonce="${nonce}"`)),
      ).toEqual([])
      expect(Array.from(html.matchAll(MODULE_PRELOAD), ([tag]) => tag).filter((tag) => !tag.includes(` nonce="${nonce}"`))).toEqual([])
      expect(ROUTER_NONCE.exec(html)?.groups?.["nonce"]).toBe(nonce)
      expect(html).not.toContain('http-equiv="Content-Security-Policy"')
      expect(first.headers()["cache-control"]).toBe("private, no-cache")
      expect(first.headers()["etag"]).toBeUndefined()

      await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await appPage.waitForAppReady()
    })
  }

  test("the admin console runs under its policy", async ({ appPage, authPage, page }) => {
    await authPage.signIn(admin.email)
    await expect(page).toHaveURL(ROUTES.ADMIN)
    await appPage.waitForAppReady()

    await page.goto(ROUTES.ADMIN_COURSES, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("a customer pays in Polar's checkout over the workspace under its policy, which frames only Polar's checkout", async ({
    appPage,
    authPage,
    page,
  }) => {
    await authPage.signIn(customer.email)
    await expect(page).toHaveURL(ROUTES.APP)
    const response = await page.goto(`${ROUTES.APP}?tier=${LICENSE_TIER.COMPLETE}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const frameSources = response?.headers()[POLICY_HEADER]?.split("; ").filter((directive) => directive.startsWith("frame-src "))

    await page.getByRole("region", { name: "Continue with Complete" }).getByRole("button", { name: "Continue to checkout" }).click()

    expect(frameSources).toStrictEqual([`frame-src ${new URL(await checkoutOverlay(page).getAttribute("src") ?? "").origin}`])
    await payInCheckoutOverlay(page)
    await expect(page).toHaveURL(new RegExp(String.raw`/app\?checkoutId=[\da-f-]{36}&tier=${LICENSE_TIER.COMPLETE}$`, "u"))
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible()
  })
})
