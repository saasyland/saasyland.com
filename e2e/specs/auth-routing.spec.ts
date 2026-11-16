import { LOCAL_SERVER_ORIGIN } from "../../src/data/local-server"
import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import { BasePage, LandingPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const LANDING_CPU_SLOWDOWN = 4

test.describe("auth routing", () => {
  test("unauthenticated /admin redirects to sign-in", async ({ page }) => {
    const response = await page.goto("/admin", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/auth\/sign-in/u)
  })

  test("unauthenticated /en/admin redirects to sign-in (default locale drops /en prefix)", async ({ page }) => {
    await page.goto("/en/admin", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await expect(page).toHaveURL(/\/auth\/sign-in/u)
  })

  test("unauthenticated /app redirects to sign-in", async ({ page }) => {
    await page.goto("/app", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await expect(page).toHaveURL(/\/auth\/sign-in/u)
  })

  test("unauthenticated localized /pl/app redirects to localized sign-in", async ({ page }) => {
    await page.goto("/pl/app", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await expect(page).toHaveURL(/\/pl-PL\/auth\/sign-in/u)
  })

  test("auth callback without session redirects to sign-in", async ({ page }) => {
    await page.goto("/auth/callback", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await expect(page).toHaveURL(/\/auth\/sign-in/u)
  })
})

for (const account of TEST_ACCOUNTS) {
  test(`${account.role} bypasses sign-in and sign-up on direct and client navigation`, async ({ baseURL, context }) => {
    const errors: string[] = []
    context.on("weberror", (webError) => errors.push(webError.error().message))
    const signedIn = await context.request.post("/api/auth/sign-in/email", {
      data: { email: account.email, password: TEST_PASSWORD },
      headers: { "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::`, Origin: baseURL ?? LOCAL_SERVER_ORIGIN },
    })
    expect(signedIn.ok()).toBe(true)
    const workspace = account.role === ROLE_CODES.ADMIN ? "/admin" : "/app"
    for (const prefix of ["", "/pl-PL"]) {
      for (const route of ["/auth/sign-in", "/auth/sign-up"]) {
        const tab = await context.newPage()
        const response = await tab.goto(`${prefix}${route}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
        await expect(tab).toHaveURL(new RegExp(`${prefix}${workspace}/?$`, "u"))
        const html = await response?.text()
        expect(html).not.toContain('id="sign-in-form"')
        expect(html).not.toContain('id="sign-up-form"')
        await new BasePage(tab).waitForAppReady()
        await expect(tab.getByRole("heading").first()).toBeVisible()
        await tab.close()
      }
    }
    const fromLanding = await context.newPage()
    await new LandingPage(fromLanding).goto()
    await fromLanding.locator('a[href^="/auth/sign-in"]').first().click()
    await expect(fromLanding).toHaveURL(new RegExp(`${workspace}/?$`, "u"))
    await new BasePage(fromLanding).waitForAppReady()
    await expect(fromLanding.locator("#sign-in-form, #sign-up-form")).toHaveCount(0)
    await fromLanding.close()
    expect(errors).toEqual([])
  })
}

test("client navigation rechecks an ended session despite cached workspace data", async ({ appPage, authPage, baseURL, page }) => {
  const customer = TEST_ACCOUNTS[1]
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    data: { email: customer.email, password: TEST_PASSWORD },
    headers: { "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::`, Origin: baseURL ?? LOCAL_SERVER_ORIGIN },
  })
  expect(signedIn.ok()).toBe(true)
  await page.goto("/app", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const signedOut = await page.request.post("/api/auth/sign-out", { data: {}, headers: { Origin: new URL(page.url()).origin } })
  expect(signedOut.ok()).toBe(true)
  await page.getByRole("navigation", { name: "App navigation", exact: true }).getByRole("link", { name: "Settings", exact: true }).click()
  await expect(page).toHaveURL(`/auth/sign-in?redirect=${encodeURIComponent("/app/settings")}`)
  await appPage.waitForAppReady()
  await expect(authPage.signInSubmitButton()).toBeVisible()
  await expect(page.getByText(customer.email, { exact: true })).toHaveCount(0)
  await page.goto("/auth/sign-up", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(page).toHaveURL(/\/auth\/sign-up$/u)
  await appPage.waitForAppReady()
  await expect(page.locator("#sign-up-form")).toBeVisible()
})

test("a signed-in visitor who presses a header link while the landing page hydrates opens the workspace without a hydration error", async ({
  appPage,
  baseURL,
  browserName,
  page,
}) => {
  const customer = TEST_ACCOUNTS[1]
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    data: { email: customer.email, password: TEST_PASSWORD },
    headers: { "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::`, Origin: baseURL ?? LOCAL_SERVER_ORIGIN },
  })
  expect(signedIn.ok()).toBe(true)
  if (browserName === "chromium") {
    const devtools = await page.context().newCDPSession(page)
    await devtools.send("Emulation.setCPUThrottlingRate", { rate: LANDING_CPU_SLOWDOWN })
  }
  await page.goto("/", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByRole("banner").locator('a[href^="/auth/sign-in"]').first().click()
  await expect(page).toHaveURL(/\/app\/?$/u)
  await appPage.waitForAppReady()
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
