import { LOCAL_SERVER_ORIGIN } from "../../src/data/local-server"
import { SESSION_EXPIRED_CODE } from "../../src/integrations/better-auth/auth.errors"
import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { SESSION_STALE_TIME_MS } from "../../src/modules/session/session.constants"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import { BasePage } from "../pages"
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
    const fromForgotPassword = await context.newPage()
    await fromForgotPassword.goto(ROUTES.FORGOT_PASSWORD, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    const forgotPasswordPage = new BasePage(fromForgotPassword)
    await forgotPasswordPage.waitForAppReady()
    await forgotPasswordPage.waitForHydration(fromForgotPassword.getByRole("main"))
    await fromForgotPassword.locator(`a[href^="${ROUTES.SIGN_IN}"]`).first().click()
    await expect(fromForgotPassword).toHaveURL(new RegExp(`${workspace}/?$`, "u"))
    await forgotPasswordPage.waitForAppReady()
    await expect(fromForgotPassword.locator("#sign-in-form, #sign-up-form")).toHaveCount(0)
    await fromForgotPassword.close()
    expect(errors).toEqual([])
  })
}

test("a client navigation once the cached session is stale rechecks an ended session despite cached workspace data", async ({
  appPage,
  authPage,
  baseURL,
  page,
}) => {
  const customer = TEST_ACCOUNTS[1]
  await page.clock.install()
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    data: { email: customer.email, password: TEST_PASSWORD },
    headers: { "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::`, Origin: baseURL ?? LOCAL_SERVER_ORIGIN },
  })
  expect(signedIn.ok()).toBe(true)
  await page.goto("/app", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const signedOut = await page.request.post("/api/auth/sign-out", { data: {}, headers: { Origin: new URL(page.url()).origin } })
  expect(signedOut.ok()).toBe(true)
  await page.clock.fastForward(SESSION_STALE_TIME_MS)
  await page.getByRole("navigation", { name: "App navigation", exact: true }).getByRole("link", { name: "Settings", exact: true }).click()
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === ROUTES.SIGN_IN &&
      url.searchParams.get("redirect") === ROUTES.APP_SETTINGS &&
      url.searchParams.get("error") === SESSION_EXPIRED_CODE,
  )
  await appPage.waitForAppReady()
  await expect(page.getByRole("status")).toHaveText("Your session ended. Sign in to continue to Settings.")
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
