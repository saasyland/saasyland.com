import assert from "node:assert/strict"

import type { APIRequestContext, Browser, BrowserContext, Page, PlaywrightWorkerArgs, Request } from "@playwright/test"
import { STACK_DEFAULTS } from "@saasyland/stack"
import { API_ENDPOINT } from "@saasyland/stack/api"
import * as zod from "zod"

import { LOCAL_SERVER_ORIGIN } from "../../src/data/local-server"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { ERROR_CODES } from "../../src/modules/_core/constants/errors"

import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { DEFAULT_PAGE_SIZE } from "../../src/modules/_core/utils/pagination"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import { ROBOTS, buildTitle } from "../../src/lib/seo"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_BUNDLE } from "../data/licenses"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import { expectVerificationEmail } from "../fixtures/emails"
import { CLI_ACTIVATION, machineConnection, sendToApi } from "../fixtures/cli-api"
import { buyLicense, deliverPaidOrder } from "../fixtures/license"
import { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage, RENDERED_LOCATION_KEY, recordRenderedLocations } from "../pages/base-page"
import authErrors from "../../messages/en-US/auth.errors.json" with { type: "json" }
import gridMessages from "../../messages/en-US/components.custom.data-grid.json" with { type: "json" }
import notFoundMessages from "../../messages/en-US/errors.not-found.json" with { type: "json" }
import usersMessages from "../../messages/en-US/pages.admin.users.json" with { type: "json" }

const [admin, customer] = TEST_ACCOUNTS
const { headers } = usersMessages.table

const NEW_PASSWORD = "AdminChosenPassword789!"
const FIREFOX_ON_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0"
const SAFARI_ON_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1"

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

interface Device {
  readonly context: BrowserContext
  readonly page: Page
}

interface Browsers {
  readonly baseURL: string | undefined
  readonly browser: Browser
}

const clientHeaders = (): Record<string, string> => ({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })

const card = (page: Page, title: string) =>
  page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { exact: true, level: 2, name: title }) })

const accountDetail = (page: Page, label: string) => card(page, "Account").getByText(label, { exact: true }).locator("xpath=following-sibling::dd")

const signInWith = async (page: Page, email: string, password = TEST_PASSWORD): Promise<void> => {
  const authPage = new AuthPage(page)
  await page.setExtraHTTPHeaders(clientHeaders())
  await authPage.gotoSignIn()
  await authPage.emailField().fill(email)
  await authPage.passwordField().fill(password)
  await authPage.signInSubmitButton().click()
}

const openDevice = async ({ baseURL, browser }: Browsers, email: string, userAgent?: string): Promise<Device> => {
  const context = await browser.newContext({ ...(baseURL === undefined ? {} : { baseURL }), ...(userAgent === undefined ? {} : { userAgent }) })
  await context.addInitScript(recordRenderedLocations, RENDERED_LOCATION_KEY)
  const page = await context.newPage()
  await signInWith(page, email)
  return { context, page }
}

const openVerifiedDevice = async (browsers: Browsers, request: APIRequestContext, email: string, userAgent?: string): Promise<Device> => {
  const device = await openDevice(browsers, email, userAgent)
  await expect(device.page).toHaveURL(/\/auth\/verify-email\?.*unverified=true/u)
  await new AuthPage(device.page).waitForAppReady()
  await device.page.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(device.page).toHaveURL(/\/app\/?$/u)
  return device
}

const expectSignedOut = async (page: Page): Promise<void> => {
  await page.goto("/app", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(page).toHaveURL(/\/auth\/sign-in/u)
}

const SERVER_FUNCTION = "**/_serverFn/**"
const SERVER_FUNCTION_PATH = "/_serverFn/"

interface ServerCall {
  readonly body: Buffer | null
  readonly headers: Readonly<Record<string, string>>
  readonly method: string
  readonly url: string
}

const serverErrorSchema = zod.object({
  p: zod.object({ v: zod.tuple([zod.object({ s: zod.object({ message: zod.object({ s: zod.string() }) }) })]) }),
})

const serverCallOf = (request: Request): ServerCall => ({
  body: request.postDataBuffer(),
  headers: Object.fromEntries(Object.entries(request.headers()).filter(([name]) => name !== "cookie")),
  method: request.method(),
  url: request.url(),
})

const carries = (request: Request, marker: string): boolean =>
  decodeURIComponent(request.url()).includes(marker) || (request.postData() ?? "").includes(marker)

const recordReads = async (page: Page, marker: string, act: () => Promise<void>): Promise<ServerCall[]> => {
  const calls: ServerCall[] = []
  const record = (request: Request): void => {
    if (request.method() === "GET" && request.url().includes(SERVER_FUNCTION_PATH) && carries(request, marker)) {
      calls.push(serverCallOf(request))
    }
  }
  page.on("request", record)
  await act()
  page.off("request", record)
  expect(calls.length, `a read that carries ${marker}`).toBeGreaterThan(0)
  return calls
}

const interceptMutation = async (page: Page, marker: string, act: () => Promise<void>): Promise<ServerCall> => {
  const intercepted = Promise.withResolvers<ServerCall>()
  await page.route(SERVER_FUNCTION, async (route) => {
    if (route.request().method() !== "POST" || !carries(route.request(), marker)) {
      await route.fallback()
      return
    }
    intercepted.resolve(serverCallOf(route.request()))
    await route.abort()
  })
  await act()
  const call = await intercepted.promise
  await page.unroute(SERVER_FUNCTION)
  await expect(page.getByRole("dialog").or(page.getByRole("alertdialog"))).toHaveCount(0)
  return call
}

const refusalOf = async (requester: APIRequestContext, origin: string, { body, headers, method, url }: ServerCall): Promise<string | undefined> => {
  const response = await requester.fetch(url, { headers: { ...headers, origin }, method, ...(body === null ? {} : { data: body }) })
  expect(response.ok()).toBe(true)
  return serverErrorSchema.safeParse(await response.json()).data?.p.v[0].s.message.s
}

const verifiedRequest = async (
  { baseURL, playwright }: { baseURL: string | undefined; playwright: PlaywrightWorkerArgs["playwright"] },
  request: APIRequestContext,
  email: string,
): Promise<APIRequestContext> => {
  const origin = baseURL ?? LOCAL_SERVER_ORIGIN
  const context = await playwright.request.newContext({ baseURL: origin, extraHTTPHeaders: { ...clientHeaders(), Origin: origin } })
  const unverified = await context.post("/api/auth/sign-in/email", { data: { email, password: TEST_PASSWORD } })
  expect(unverified.status()).toBe(HTTP_STATUS.FORBIDDEN)
  expect((await context.get((await expectVerificationEmail(request, email)).toString())).ok()).toBe(true)
  return context
}

const chooseUserAction = async (page: Page, name: string, action: string): Promise<void> => {
  await userActions(page, name).click()
  await page.getByRole("menuitem", { name: action }).click()
}

const reloadProfile = async ({ appPage, page }: { appPage: BasePage; page: Page }): Promise<void> => {
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const userActions = (page: Page, name: string) => page.getByRole("button", { name: `Actions for ${name}`, exact: true })

const PAGE_RANGE = new RegExp(
  `^${gridMessages.pagination.range.replace("{from}", "1").replace("{to}", "\\d+").replace("{total}", "(?<total>\\d+)")}$`,
  "u",
)

const usersTable = (page: Page) => page.getByRole("table", { name: usersMessages.table.label })

const gotoUsers = async ({ appPage, page }: { appPage: BasePage; page: Page }): Promise<void> => {
  await page.goto("/admin/users/all", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const filterBy = async (page: Page, column: string, option: string): Promise<void> => {
  await page.getByRole("button", { name: new RegExp(`^${gridMessages.filters.filter}`, "u") }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("option", { name: new RegExp(`^${column}`, "u") }).click()
  await dialog.getByRole("option", { exact: true, name: option }).click()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
}

test("admin sorts the user table by name and selects every row", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await gotoUsers({ appPage, page })

  const table = usersTable(page)
  const userHeader = table.getByRole("columnheader", { name: new RegExp(`^${headers.user}`, "u") })
  const sortByUser = table.getByRole("button", { exact: true, name: headers.user })
  const names = table.locator("tbody tr td:nth-child(2) a")
  await sortByUser.click()
  await expect(userHeader).toHaveAttribute("aria-sort", "ascending")
  await expect(table).toHaveAttribute("aria-busy", "false")
  const ascending = await names.allTextContents()
  expect(ascending.length).toBeGreaterThan(1)
  expect(ascending).toEqual(ascending.toSorted())
  await sortByUser.click()
  await expect(userHeader).toHaveAttribute("aria-sort", "descending")
  await expect(table).toHaveAttribute("aria-busy", "false")
  const descending = await names.allTextContents()
  expect(descending).toEqual(descending.toSorted().toReversed())
  await table.getByRole("checkbox", { name: gridMessages.selection.selectPage }).focus()
  await page.keyboard.press("Space")
  await expect(table.getByRole("checkbox", { name: gridMessages.selection.selectRow }).first()).toBeChecked()
  await expect(table.getByRole("checkbox", { name: gridMessages.selection.selectRow }).last()).toBeChecked()
  await expect(page.getByRole("region", { name: gridMessages.selection.region })).toContainText(String(descending.length))
})

test("the admin finds users by name or email and filters them by role and status on the server", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await gotoUsers({ appPage, page })
  const rows = usersTable(page).locator("tbody tr")
  const search = page.getByRole("searchbox", { name: usersMessages.table.search })

  await search.fill(customer.email)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(customer.name)
  await search.fill(customer.name)
  await expect(rows.filter({ hasText: customer.email })).toHaveCount(1)

  await filterBy(page, headers.status, usersMessages.filters.status.options.pending)
  await expect(page.getByRole("status").filter({ hasText: gridMessages.empty.filteredTitle })).toBeVisible()
  await page.getByRole("button", { name: gridMessages.filters.remove.replace("{column}", headers.status) }).click()
  await expect(rows).toHaveCount(1)

  await search.fill(admin.email)
  await filterBy(page, headers.role, usersMessages.filters.role.options.admin)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(admin.name)
  await search.fill(customer.email)
  await expect(page.getByRole("status").filter({ hasText: gridMessages.empty.filteredTitle })).toBeVisible()
  await page.getByRole("button", { name: gridMessages.empty.clear }).click()
  await expect(search).toHaveValue("")
  await expect(page.getByRole("group", { name: gridMessages.filters.active })).toHaveCount(0)
  await expect(page.getByRole("status").filter({ hasText: gridMessages.empty.filteredTitle })).toHaveCount(0)
  const range = page.getByText(PAGE_RANGE)
  await expect(range).toBeVisible()
  const total = Number(PAGE_RANGE.exec(await range.innerText())?.groups?.["total"])
  expect(total).toBeGreaterThan(1)
  await expect(rows).toHaveCount(Math.min(total, DEFAULT_PAGE_SIZE))
})

test("the admin hides and shows the users' columns, keeps the layout after a reload and resets it", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await gotoUsers({ appPage, page })

  const headerNames = usersTable(page).getByRole("columnheader")
  const defaults = ["", headers.user, headers.role, headers.status, headers.emailVerified, headers.createdAt, gridMessages.actions.header]
  await expect(headerNames).toHaveText(defaults)

  await page.getByRole("button", { name: gridMessages.toolbar.columns }).click()
  await page.getByRole("menuitemcheckbox", { name: headers.emailVerified }).click()
  await page.getByRole("menuitemcheckbox", { name: headers.timezone }).click()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("menu")).toHaveCount(0)
  await page.getByRole("button", { name: `${headers.role} column options` }).click()
  await page.getByRole("menuitem", { name: gridMessages.column.hide }).click()

  const arranged = ["", headers.user, headers.status, headers.timezone, headers.createdAt, gridMessages.actions.header]
  await expect(headerNames).toHaveText(arranged)
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(headerNames).toHaveText(arranged)
  await expect(page.getByRole("columnheader", { name: new RegExp(`^${headers.user}`, "u") })).toHaveCSS("position", "sticky")

  await page.getByRole("button", { name: gridMessages.toolbar.reset }).click()
  await expect(headerNames).toHaveText(defaults)
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
  await expect(customerPage).toHaveURL(/\/auth\/verify-email\?.*unverified=true/u)
  await customerAuth.waitForAppReady()
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

test("revoking one of a user's sessions signs out that browser and keeps the others", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  request,
}) => {
  await signInAsAdmin({ appPage, authPage, page })
  const { email } = await addUser({ appPage, page }, "Two Device Customer")
  const firefox = await openVerifiedDevice({ baseURL, browser }, request, email, FIREFOX_ON_WINDOWS)
  const iphone = await openDevice({ baseURL, browser }, email, SAFARI_ON_IPHONE)
  await expect(iphone.page).toHaveURL(/\/app\/?$/u)

  await reloadProfile({ appPage, page })
  const sessions = card(page, "Sessions").getByRole("listitem")
  await expect(sessions).toHaveCount(2)
  await sessions.filter({ hasText: "Firefox on Windows" }).getByRole("button", { exact: true, name: "Revoke" }).click()
  await expect(page.getByText("Session revoked.")).toBeVisible()
  await expect(sessions).toHaveCount(1)
  await expect(sessions.filter({ hasText: "Firefox on Windows" })).toHaveCount(0)

  await expectSignedOut(firefox.page)
  await iphone.page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(iphone.page).toHaveURL(/\/app\/?$/u)
  await firefox.context.close()
  await iphone.context.close()
})

test("banning a user ends their sessions and refuses their sign-in, and unbanning lets them sign in again", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  request,
}) => {
  await signInAsAdmin({ appPage, authPage, page })
  const { email } = await addUser({ appPage, page }, "Banned Customer")
  const device = await openVerifiedDevice({ baseURL, browser }, request, email)

  await reloadProfile({ appPage, page })
  await userActions(page, "Banned Customer").click()
  await page.getByRole("menuitem", { name: "Ban user" }).click()
  await page.getByRole("alertdialog", { name: "Ban user?" }).getByRole("button", { name: "Ban user" }).click()
  await expect(page.getByText("User banned.")).toBeVisible()
  await expect(accountDetail(page, "Status")).toHaveText("Banned")
  await expect(card(page, "Sessions").getByText("No active sessions.")).toBeVisible()

  await expectSignedOut(device.page)
  await signInWith(device.page, email)
  await expect(device.page.getByText(authErrors.accountSuspended)).toBeVisible()
  await expect(device.page).toHaveURL(/\/auth\/sign-in/u)

  await userActions(page, "Banned Customer").click()
  await page.getByRole("menuitem", { name: "Unban user" }).click()
  await expect(page.getByText("User unbanned.")).toBeVisible()
  await expect(accountDetail(page, "Status")).toHaveText("Active")

  await signInWith(device.page, email)
  await expect(device.page).toHaveURL(/\/app\/?$/u)
  await device.context.close()
})

test("the admin sets a new password for a user, who then signs in with it and not with the old one", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  request,
}) => {
  await signInAsAdmin({ appPage, authPage, page })
  const { email } = await addUser({ appPage, page }, "Reset Customer")
  const device = await openVerifiedDevice({ baseURL, browser }, request, email)
  await device.context.clearCookies()

  await userActions(page, "Reset Customer").click()
  await page.getByRole("menuitem", { name: "Reset password" }).click()
  const dialog = page.getByRole("dialog", { name: "Reset password" })
  await dialog.getByLabel("New password").fill(NEW_PASSWORD)
  await dialog.getByRole("button", { name: "Reset password" }).click()
  await expect(page.getByText("Password reset successfully.")).toBeVisible()
  await expect(dialog).toHaveCount(0)

  await signInWith(device.page, email)
  await expect(device.page.getByText(authErrors.invalidEmailOrPassword)).toBeVisible()
  await signInWith(device.page, email, NEW_PASSWORD)
  await expect(device.page).toHaveURL(/\/app\/?$/u)
  await device.context.close()
})

test("deleting a user removes them from the table, and their address can no longer sign in", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  request,
}) => {
  await signInAsAdmin({ appPage, authPage, page })
  const { email } = await addUser({ appPage, page }, "Deleted Customer")
  const device = await openVerifiedDevice({ baseURL, browser }, request, email)

  await userActions(page, "Deleted Customer").click()
  await page.getByRole("menuitem", { name: "Delete user" }).click()
  await page.getByRole("alertdialog", { name: "Delete user?" }).getByRole("button", { name: "Delete user" }).click()
  await expect(page.getByText("User deleted.")).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/users\/all$/u)
  await appPage.waitForAppReady()
  await page.getByRole("searchbox", { name: usersMessages.table.search }).fill(email)
  await expect(page.getByRole("status").filter({ hasText: gridMessages.empty.filteredTitle })).toBeVisible()

  await expectSignedOut(device.page)
  await signInWith(device.page, email)
  await expect(device.page.getByText(authErrors.invalidEmailOrPassword)).toBeVisible()
  await device.context.close()
})

test("a customer and a signed-out visitor are refused by every user-management server function, and nothing changes", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  playwright,
  request,
}) => {
  const origin = baseURL ?? LOCAL_SERVER_ORIGIN
  const refusedEmail = `refused.${crypto.randomUUID()}@example.test`
  await signInAsAdmin({ appPage, authPage, page })
  const banned = await addUser({ appPage, page }, "Refused Banned Customer")
  await chooseUserAction(page, "Refused Banned Customer", "Ban user")
  await page.getByRole("alertdialog", { name: "Ban user?" }).getByRole("button", { name: "Ban user" }).click()
  await expect(accountDetail(page, "Status")).toHaveText("Banned")
  const attacker = await addUser({ appPage, page }, "Refused Customer")
  const probe = await addUser({ appPage, page }, "Refused Probe")
  const device = await openVerifiedDevice({ baseURL, browser }, request, probe.email)
  const customer = await verifiedRequest({ baseURL, playwright }, request, attacker.email)
  const visitor = await playwright.request.newContext({ baseURL: origin })

  await gotoUsers({ appPage, page })
  const list = await recordReads(page, probe.email, async () => {
    await page.getByRole("searchbox", { name: usersMessages.table.search }).fill(probe.email)
    await expect(usersTable(page).locator("tbody tr")).toHaveCount(1)
  })
  const create = await interceptMutation(page, refusedEmail, async () => {
    await page.getByRole("button", { name: "Add user", exact: true }).click()
    const dialog = page.getByRole("dialog", { name: "Add user" })
    await dialog.getByRole("textbox", { name: "Name" }).fill("Refused Newcomer")
    await dialog.getByRole("textbox", { name: "Email" }).fill(refusedEmail)
    await dialog.getByLabel("Password").fill(TEST_PASSWORD)
    await dialog.getByRole("button", { name: "Add user", exact: true }).click()
    await page.keyboard.press("Escape")
  })
  const read = await recordReads(page, probe.id, async () => {
    await usersTable(page).getByRole("link", { name: "Refused Probe" }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/users/${probe.id}$`, "u"))
    await appPage.waitForAppReady()
    await expect(card(page, "Sessions").getByRole("listitem")).toHaveCount(1)
  })
  const update = await interceptMutation(page, probe.id, async () => {
    await chooseUserAction(page, "Refused Probe", "Edit user")
    const edit = page.getByRole("dialog", { name: "Edit user" })
    await edit.getByRole("textbox", { name: "Name" }).fill("Renamed Probe")
    await edit.getByRole("button", { name: "Save", exact: true }).click()
    await page.keyboard.press("Escape")
  })
  const role = await interceptMutation(page, probe.id, async () => {
    await userActions(page, "Refused Probe").click()
    await page.getByRole("menuitem", { name: "Change role" }).click()
    await page.getByRole("menuitemradio", { name: "Admin" }).click()
  })
  const ban = await interceptMutation(page, probe.id, async () => {
    await chooseUserAction(page, "Refused Probe", "Ban user")
    await page.getByRole("alertdialog", { name: "Ban user?" }).getByRole("button", { name: "Ban user" }).click()
  })
  const password = await interceptMutation(page, probe.id, async () => {
    await chooseUserAction(page, "Refused Probe", "Reset password")
    const dialog = page.getByRole("dialog", { name: "Reset password" })
    await dialog.getByLabel("New password").fill(NEW_PASSWORD)
    await dialog.getByRole("button", { name: "Reset password" }).click()
    await page.keyboard.press("Escape")
  })
  const impersonate = await interceptMutation(page, probe.id, async () => {
    await chooseUserAction(page, "Refused Probe", "Impersonate")
  })
  const sessions = card(page, "Sessions")
  const revokeSession = await interceptMutation(page, "sessionId", async () => {
    await sessions.getByRole("button", { exact: true, name: "Revoke" }).click()
  })
  const revokeSessions = await interceptMutation(page, probe.id, async () => {
    await sessions.getByRole("button", { name: "Revoke all" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Revoke all" }).click()
  })
  const remove = await interceptMutation(page, probe.id, async () => {
    await chooseUserAction(page, "Refused Probe", "Delete user")
    await page.getByRole("alertdialog", { name: "Delete user?" }).getByRole("button", { name: "Delete user" }).click()
  })
  await page.goto(`/admin/users/${banned.id}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const unban = await interceptMutation(page, banned.id, async () => {
    await chooseUserAction(page, "Refused Banned Customer", "Unban user")
  })

  for (const call of [...list, ...read, create, update, role, ban, unban, password, impersonate, revokeSession, revokeSessions, remove]) {
    expect(await refusalOf(customer, origin, call), `${call.method} ${call.url} as a customer`).toBe(ERROR_CODES.FORBIDDEN)
    expect(await refusalOf(visitor, origin, call), `${call.method} ${call.url} signed out`).toBe(ERROR_CODES.UNAUTHORIZED)
  }

  await expect(accountDetail(page, "Status")).toHaveText("Banned")
  await page.goto(`/admin/users/${probe.id}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(page.getByRole("heading", { level: 2, name: "Refused Probe" })).toBeVisible()
  await expect(accountDetail(page, "Role")).toHaveText("Customer")
  await expect(accountDetail(page, "Status")).toHaveText("Active")
  await expect(card(page, "Sessions").getByRole("listitem")).toHaveCount(1)
  await device.page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(device.page).toHaveURL(/\/app\/?$/u)
  expect(await (await customer.get("/api/auth/get-session")).json()).toMatchObject({ user: { email: attacker.email } })
  const signIn = await visitor.post("/api/auth/sign-in/email", { data: { email: probe.email, password: TEST_PASSWORD }, headers: { ...clientHeaders(), Origin: origin } })
  expect(signIn.ok()).toBe(true)
  await gotoUsers({ appPage, page })
  await page.getByRole("searchbox", { name: usersMessages.table.search }).fill(refusedEmail)
  await expect(page.getByRole("status").filter({ hasText: gridMessages.empty.filteredTitle })).toBeVisible()
  await customer.dispose()
  await visitor.dispose()
  await device.context.close()
})

test("admin reads a buyer's licence, consent, first uses and refund terms on the profile", async ({
  appPage,
  authPage,
  page,
  request,
}, testInfo) => {
  await signInAsAdmin({ appPage, authPage, page })
  const { id } = await addUser({ appPage, page }, "Licensed Buyer")
  const licence = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { name: "Licence", exact: true }) })
  const detail = (label: string) => licence.getByText(label, { exact: true }).locator("xpath=following-sibling::dd")
  await expect(licence.getByText("This account has not bought a licence.")).toBeVisible()

  await deliverPaidOrder(request, { tier: LICENSE_TIER.COMPLETE, userId: id, withdrawalConsent: true })
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()

  await expect(detail("Tier")).toHaveText("Complete")
  await expect(detail("Status")).toHaveText("Active")
  await expect(detail("Consent to immediate delivery")).toHaveText(/^Given on /u)
  await expect(detail("First activation")).toHaveText("Never")
  await expect(detail("First template download")).toHaveText("Never")
  await expect(detail("First paid lesson opened")).toHaveText("Never")
  await expect(detail("Refund")).toHaveText(
    /^Refundable until .+\. The buyer consented to immediate delivery, the CLI has not downloaded templates with this licence, and no paid lesson has been opened yet\.$/u,
  )
  for (const colorScheme of COLOR_SCHEMES) {
    await page.emulateMedia({ colorScheme })
    expect(await accessibilityViolations(page)).toEqual([])
    await licence.screenshot({ animations: "disabled", path: testInfo.outputPath(`admin-user-licence-${colorScheme}.png`) })
  }
})

test("admin reads the first CLI activation and the first template download on the buyer's profile, and the refund terms they end", async ({
  appPage,
  authPage,
  baseURL,
  page,
  request,
}) => {
  await signInAsAdmin({ appPage, authPage, page })
  const { id } = await addUser({ appPage, page }, "Using Buyer")
  const licence = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { name: "Licence", exact: true }) })
  const detail = (label: string) => licence.getByText(label, { exact: true }).locator("xpath=following-sibling::dd")
  const { key } = await buyLicense(request, { tier: LICENSE_TIER.CORE, userId: id })
  const connection = await machineConnection(key, baseURL)

  const activation = await sendToApi(API_ENDPOINT.ACTIVATE, CLI_ACTIVATION, connection)
  assert(activation.success)
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(detail("First activation")).not.toHaveText("Never")
  await expect(detail("First template download")).toHaveText("Never")
  await expect(detail("Refund")).toHaveText(/^Refundable until /u)

  const bundle = await sendToApi(
    API_ENDPOINT.BUNDLE,
    { body: { answers: STACK_DEFAULTS, version: TEST_BUNDLE.version }, params: { activationId: activation.data.activationId } },
    connection,
  )
  expect(bundle.success).toBe(true)
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const downloadedOn = (await detail("First template download").innerText()).trim()
  expect(downloadedOn).not.toBe("Never")
  await expect(detail("Refund")).toHaveText(
    `Not refundable. The buyer consented to immediate delivery, and the CLI downloaded templates with this licence on ${downloadedOn}.`,
  )
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

test("a user who does not exist answers 404 with the not-found page and its title", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })

  const response = await page.goto(`${ROUTES.ADMIN.USERS.INDEX}/${crypto.randomUUID()}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()

  expect(response?.status()).toBe(HTTP_STATUS.NOT_FOUND)
  await expect(page).toHaveTitle(buildTitle({ locale: I18N.DEFAULT_LOCALE, title: notFoundMessages.metadata.title }))
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", ROBOTS.NOINDEX)
  await expect(page.getByRole("heading", { level: 1, name: notFoundMessages.metadata.title })).toBeVisible()
})
