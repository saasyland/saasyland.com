import type { Page } from "@playwright/test"

import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_VIDEO } from "../data/videos"
import { expect, test } from "../fixtures/test"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin, customer] = TEST_ACCOUNTS

const SIGNED_PATH = /^\/media\/[\da-z]+\.[\da-f]{64}\//u
const FORGED_SIGNATURE = "0".repeat(64)

const signIn = async (page: Page, authPage: AuthPage, account: (typeof TEST_ACCOUNTS)[number]): Promise<void> => {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
  await authPage.gotoSignIn()
  await authPage.emailField().fill(account.email)
  await authPage.passwordField().fill(TEST_PASSWORD)
  await authPage.signInSubmitButton().click()
  await expect(page).toHaveURL(account.role === ROLE_CODES.ADMIN ? /\/admin\/?$/u : /\/app\/?$/u)
}

test.describe("video library", () => {
  test("an administrator previews a published video through a signed, expiring path", async ({ authPage, page }) => {
    await signIn(page, authPage, admin)
    await page.goto("/admin/videos", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    const row = page.getByRole("row").filter({ hasText: TEST_VIDEO.title })
    await expect(row).toContainText("0:02")
    await expect(row).toContainText(`${String(TEST_VIDEO.width)}×${String(TEST_VIDEO.height)}`)

    const playlist = page.waitForResponse((response) => response.url().endsWith(`/${TEST_VIDEO.id}/master.m3u8`))
    await row.getByRole("button", { name: `Preview ${TEST_VIDEO.title}` }).click()
    const response = await playlist

    await expect(page.getByRole("dialog").getByRole("heading", { name: TEST_VIDEO.title })).toBeVisible()
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toBe("application/vnd.apple.mpegurl")
    expect(new URL(response.url()).pathname).toMatch(SIGNED_PATH)
    expect(await response.text()).toContain("#EXT-X-MEDIA:TYPE=AUDIO")

    const segment = await page.request.get(response.url().replace("master.m3u8", "180p/seg-00000.m4s"))
    expect(segment.status()).toBe(200)
    expect(segment.headers()["content-type"]).toBe("video/iso.segment")
    expect(segment.headers()["cache-control"]).toBe("private, max-age=86400, immutable")

    const forged = await page.request.get(response.url().replace(/\.[\da-f]{64}\//u, `.${FORGED_SIGNATURE}/`))
    expect(forged.status()).toBe(403)
  })

  test("a customer cannot open the library or stream without a signed path", async ({ authPage, page }) => {
    await signIn(page, authPage, customer)
    await page.goto("/admin/videos", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page).toHaveURL(/\/app\/?$/u)

    const unsigned = await page.request.get(`/media/zz.${FORGED_SIGNATURE}/${TEST_VIDEO.id}/master.m3u8`)
    expect(unsigned.status()).toBe(403)
  })
})
