import type { Page } from "@playwright/test"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import { expectVerificationEmail } from "../fixtures/emails"
import { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage, RENDERED_LOCATION_KEY, recordRenderedLocations } from "../pages/base-page"

const [admin] = TEST_ACCOUNTS

const BROWSER_TIMEZONE = "America/Los_Angeles"
const BROWSER_TIME = new Date("2026-11-16T00:05:00Z")

const signInAsAdmin = async ({ appPage, authPage, page }: { appPage: BasePage; authPage: AuthPage; page: Page }): Promise<void> => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await appPage.waitForAppReady()
}

const addUser = async ({ appPage, page }: { appPage: BasePage; page: Page }, name: string): Promise<{ email: string; id: string }> => {
  const email = `managed.${crypto.randomUUID()}@example.test`
  await page.goto("/admin/users/all", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByRole("button", { name: "Add user", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Add user" })
  await dialog.getByRole("textbox", { name: "Name" }).fill(name)
  await dialog.getByRole("textbox", { name: "Email" }).fill(email)
  await dialog.getByLabel("Password").fill(TEST_PASSWORD)
  await dialog.getByRole("button", { name: "Add user", exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/users\/(?!all$)[^/]+$/u)
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible()
  const id = new URL(page.url()).pathname.split("/").at(-1)
  if (id === undefined) throw new Error("The new user's profile has no id")
  return { email, id }
}

const userActions = (page: Page, name: string) => page.getByRole("button", { name: `Actions for ${name}`, exact: true })

test("admin sorts the user table by name and selects every row", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.goto("/admin/users/all", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()

  const table = page.getByRole("table")
  const userHeader = table.getByRole("columnheader", { name: /^User/u })
  const names = table.locator("tbody tr td:nth-child(2) a")
  await userHeader.getByRole("button", { name: /^User/u }).click()
  await expect(userHeader).toHaveAttribute("aria-sort", "ascending")
  await expect(table.getByRole("checkbox", { name: "Select row" }).first()).toBeVisible()
  const ascending = await names.allTextContents()
  expect(ascending.length).toBeGreaterThan(1)
  expect(ascending).toEqual(ascending.toSorted())
  await userHeader.getByRole("button", { name: /^User/u }).click()
  await expect(userHeader).toHaveAttribute("aria-sort", "descending")
  await expect(table.getByRole("checkbox", { name: "Select row" }).first()).toBeVisible()
  const descending = await names.allTextContents()
  expect(descending.length).toBeGreaterThan(1)
  expect(descending).toEqual(descending.toSorted().toReversed())
  await table.locator("label").filter({ has: page.getByRole("checkbox", { name: "Select all rows" }) }).click()
  await expect(table.getByRole("checkbox", { name: "Select row" }).first()).toBeChecked()
  await expect(table.getByRole("checkbox", { name: "Select row" }).last()).toBeChecked()
})

test("admin adds a user, renames them and makes them an admin", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await addUser({ appPage, page }, "Managed Customer")
  const account = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { name: "Account" }) })
  await expect(account.getByText("Role", { exact: true }).locator("xpath=following-sibling::dd")).toHaveText("Customer")

  await userActions(page, "Managed Customer").click()
  await page.getByRole("menuitem", { name: "Edit user" }).click()
  const edit = page.getByRole("dialog", { name: "Edit user" })
  await edit.getByRole("textbox", { name: "Name" }).fill("Managed Admin")
  await edit.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.getByRole("heading", { level: 2, name: "Managed Admin" })).toBeVisible()

  await userActions(page, "Managed Admin").click()
  await page.getByRole("menuitem", { name: "Change role" }).click()
  await page.getByRole("menuitemradio", { name: "Admin" }).click()
  await expect(account.getByText("Role", { exact: true }).locator("xpath=following-sibling::dd")).toHaveText("Admin")

  await userActions(page, "Managed Admin").click()
  await expect(page.getByRole("menuitem", { name: "Edit user" })).toBeVisible()
  await expect(page.getByRole("menuitem", { name: "Impersonate" })).toHaveCount(0)
})

test("admin impersonates a customer and stops impersonating", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  const { email, id } = await addUser({ appPage, page }, "Impersonated Customer")

  await userActions(page, "Impersonated Customer").click()
  await page.getByRole("menuitem", { name: "Impersonate" }).click()
  await expect(page).toHaveURL(/\/app\/?$/u)
  await appPage.waitForAppReady()
  const banner = page.getByRole("region", { name: "Impersonation", exact: true })
  await expect(banner).toContainText(`You are signed in as Impersonated Customer (${email}) from your admin account.`)
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(banner).toBeVisible()
  for (const colorScheme of COLOR_SCHEMES) {
    await page.emulateMedia({ colorScheme })
    expect(await accessibilityViolations(page)).toEqual([])
  }

  await banner.getByRole("button", { name: "Stop impersonating" }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/users/${id}$`, "u"))
  await expect(page.getByRole("heading", { level: 2, name: "Impersonated Customer" })).toBeVisible()
  await page.goto("/app", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(page.getByRole("region", { name: "Impersonation", exact: true })).toHaveCount(0)
})

test("a user the admin adds verifies their email, signs in and is signed out when the admin revokes every session", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  request,
}) => {
  await signInAsAdmin({ appPage, authPage, page })
  const { email, id } = await addUser({ appPage, page }, "Signed In Customer")
  await expect(page.getByText("No active sessions.")).toBeVisible()

  const customerContext = await browser.newContext(baseURL === undefined ? {} : { baseURL })
  await customerContext.addInitScript(recordRenderedLocations, RENDERED_LOCATION_KEY)
  const customerPage = await customerContext.newPage()
  const customerAuth = new AuthPage(customerPage)
  await customerAuth.signIn(email)
  await expect(customerPage).toHaveURL(/\/auth\/verify-email\?/u)
  await customerAuth.waitForAppReady()
  await customerAuth.verifyEmailResendButton().click()
  await customerPage.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(customerPage).toHaveURL(/\/app\/?$/u)

  await page.goto(`/admin/users/${id}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const sessions = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { name: "Sessions" }) })
  await expect(sessions.getByRole("listitem")).toHaveCount(1)
  await sessions.getByRole("button", { name: "Revoke all" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Revoke all" }).click()
  await expect(sessions.getByText("No active sessions.")).toBeVisible()

  await customerPage.goto("/app", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(customerPage).toHaveURL(/\/auth\/sign-in/u)
  await customerContext.close()
})

test.describe("a browser whose clock and time zone are not the server's", () => {
  test.use({ timezoneId: BROWSER_TIMEZONE })

  test("hydrates the dashboard and a user's sessions as the server printed them", async ({ appPage, authPage, page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.clock.setSystemTime(BROWSER_TIME)
    await signInAsAdmin({ appPage, authPage, page })
    await page.goto("/admin", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    const response = await page.goto(`/admin/users/${admin.id}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    const html = (await response?.text()) ?? ""
    await appPage.waitForAppReady()
    const sessions = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { name: "Sessions" }) })
    const activity = sessions.getByRole("listitem").first().locator("p").last()
    await appPage.waitForHydration(sessions)
    const printed = await activity.innerText()
    expect(html, `the server printed "${printed}"`).toContain(printed)
    expect(errors).toEqual([])
  })
})
