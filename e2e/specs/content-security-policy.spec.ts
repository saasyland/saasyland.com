import { createHash } from "node:crypto"

import type { Page } from "@playwright/test"

import { TEST_ACCOUNTS } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

import { renderedPagePolicy, scriptPolicy } from "../../src/lib/content-security-policy"
import { SECURITY_HEADERS } from "../../src/modules/_core/constants/api"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import { ROUTES } from "../../src/routes"

const [admin, customer] = TEST_ACCOUNTS
const POLICY_HEADER = "content-security-policy"
const PRERENDERED_PAGES = [ROUTES.HOME, `${ROUTES.DOCS}/features/security`, `${ROUTES.BLOG}/ai-coding-agents-repository-readiness`]
const RENDERED_PAGES = [ROUTES.SIGN_IN, ROUTES.COURSES]
const META_POLICY = /<meta http-equiv="Content-Security-Policy" content="(?<policy>[^"]+)"\/>/u
const NONCE = /'nonce-(?<nonce>[\da-f]{32})'/u
const SCRIPT = /<script(?<attributes>[^>]*)>(?<source>[\s\S]*?)<\/script>/gu
const DATA_BLOCK = /\btype="application\/ld\+json"/u

const sha256 = (source: string): string => `'sha256-${createHash("sha256").update(source).digest("base64")}'`

const executableScripts = (html: string) =>
  Array.from(html.matchAll(SCRIPT), ({ groups }) => ({ attributes: groups?.["attributes"] ?? "", source: groups?.["source"] ?? "" })).filter(
    ({ attributes }) => !DATA_BLOCK.test(attributes),
  )

const INJECTED_SCRIPT = "<script>window.__injected = true</script>"

const injectIntoHtml = async (page: Page, path: string): Promise<void> => {
  await page.route(path, async (route) => {
    const response = await route.fetch()
    await route.fulfill({ body: (await response.text()).replace("</body>", `${INJECTED_SCRIPT}</body>`), response })
  })
}

test.describe("content security policy", () => {
  for (const path of PRERENDERED_PAGES) {
    test(`the prerendered page ${path} allows only the inline scripts it was built with`, async ({ appPage, page, request }) => {
      const response = await request.get(path)
      const html = await response.text()
      const hashes = [...new Set(executableScripts(html).map(({ source }) => sha256(source)))]

      expect(response.headers()[POLICY_HEADER]).toBe(SECURITY_HEADERS["Content-Security-Policy"])
      expect(META_POLICY.exec(html)?.groups?.["policy"]).toBe(scriptPolicy(hashes))
      expect(executableScripts(html).filter(({ attributes }) => attributes.includes("src="))).toEqual([])
      expect(html).not.toMatch(/<[^>]*\snonce="/u)

      await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await appPage.waitForAppReady()
    })
  }

  for (const path of RENDERED_PAGES) {
    test(`the page ${path} the Worker renders gets a new nonce with every response, on every script`, async ({ appPage, page, request }) => {
      const first = await request.get(path)
      const second = await request.get(path)
      const nonce = NONCE.exec(first.headers()[POLICY_HEADER] ?? "")?.groups?.["nonce"] ?? ""

      expect(first.headers()[POLICY_HEADER]).toBe(renderedPagePolicy(nonce))
      expect(NONCE.exec(second.headers()[POLICY_HEADER] ?? "")?.groups?.["nonce"]).not.toBe(nonce)
      expect(executableScripts(await first.text()).filter(({ attributes }) => !attributes.includes(`nonce="${nonce}"`))).toEqual([])

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

  test("a customer reaches checkout from the workspace under its policy", async ({ appPage, authPage, page }) => {
    await authPage.signIn(customer.email)
    await expect(page).toHaveURL(ROUTES.APP)
    await page.goto(`${ROUTES.APP}?tier=${LICENSE_TIER.COMPLETE}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    await page.getByRole("region", { name: "Continue with Complete" }).getByRole("button", { name: "Continue to checkout" }).click()

    await expect(page).toHaveURL(/\/app\?checkoutId=[\da-f-]{36}$/u)
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible()
  })

  for (const path of [ROUTES.HOME, ROUTES.SIGN_IN]) {
    test(`a script injected into the HTML of ${path} is blocked and reported, and the page still works`, async ({
      appPage,
      cspViolations,
      page,
    }) => {
      await injectIntoHtml(page, path)
      await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await appPage.waitForAppReady()

      expect(await page.evaluate(() => Reflect.get(window, "__injected"))).toBeUndefined()
      await expect.poll(() => cspViolations.length).toBe(1)
      expect(cspViolations.splice(0)).toEqual([expect.stringContaining("script-src")])
    })
  }
})
