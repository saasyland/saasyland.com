import type { Browser, Page } from "@playwright/test"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import { filterByOption, gridMessages, gridOf, hideColumn, removeFilter, resetLayout } from "../fixtures/data-grid"
import { expectInvitationEmail } from "../fixtures/emails"
import { approveGitHub } from "../fixtures/github"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage, RENDERED_LOCATION_KEY, recordRenderedLocations } from "../pages/base-page"
import usersMessages from "../../messages/en-US/pages.admin.users.json" with { type: "json" }

const [admin] = TEST_ACCOUNTS

const INVITATIONS_PAGE = "/admin/users/invitations"
const INVITEE_NAME = "Invited Admin"
const GITHUB_ID_RANGE = 1e9
const GITHUB_RETURN = "/auth/callback?redirect="

const inviteeEmail = (): string => `invited.${crypto.randomUUID()}@example.test`

const openInvitations = async ({ appPage, authPage, page }: { appPage: BasePage; authPage: AuthPage; page: Page }): Promise<void> => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await page.goto(INVITATIONS_PAGE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const invite = async (page: Page, email: string, role: "Admin" | "Customer"): Promise<void> => {
  await page.getByRole("button", { exact: true, name: "Invite user" }).click()
  const dialog = page.getByRole("dialog", { name: "Invite a user" })
  await dialog.getByRole("textbox", { name: "Email" }).fill(email)
  await dialog.getByRole("button", { name: /Role/u }).click()
  await page.getByRole("option", { exact: true, name: role }).click()
  await dialog.getByRole("button", { exact: true, name: "Send invitation" }).click()
  await expect(page.getByText(`Invitation sent to ${email}.`)).toBeVisible()
}

const rowOf = (page: Page, email: string) => page.getByRole("row").filter({ hasText: email })

const settle = async (page: Page): Promise<void> => {
  const base = new BasePage(page)
  await base.waitForAppReady()
  await base.waitForHydration(page.getByRole("main"))
}

const continueWithGitHub = async (page: Page): Promise<void> => {
  const returned = page.waitForResponse((response) => response.url().includes(GITHUB_RETURN))
  await page.getByRole("button", { name: /continue with github/iu }).click()
  await returned
  await page.waitForURL(/\/auth\/invite\?token=/u, { waitUntil: "domcontentloaded" })
  await settle(page)
}

const githubId = (): number => Math.floor(Math.random() * GITHUB_ID_RANGE) + 1

const openLink = async (browser: Browser, baseURL: string | undefined, link: URL, github?: string): Promise<Page> => {
  const context = await browser.newContext(baseURL === undefined ? {} : { baseURL })
  await context.addInitScript(recordRenderedLocations, RENDERED_LOCATION_KEY)
  const page = await context.newPage()
  if (github !== undefined) {
    await approveGitHub(page, { email: github, id: githubId(), name: INVITEE_NAME })
  }
  await page.goto(`${link.pathname}${link.search}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await settle(page)
  return page
}

test("an admin invites a person as an admin, who chooses a name and password and lands in the admin console", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  request,
}) => {
  await openInvitations({ appPage, authPage, page })
  const email = inviteeEmail()
  await invite(page, email, "Admin")
  await expect(rowOf(page, email)).toContainText("Pending")
  await expect(rowOf(page, email)).toContainText("Admin")
  for (const colorScheme of COLOR_SCHEMES) {
    await page.emulateMedia({ colorScheme })
    expect(await accessibilityViolations(page)).toEqual([])
  }

  const invitee = await openLink(browser, baseURL, await expectInvitationEmail(request, email))
  await expect(invitee.getByRole("heading", { level: 1, name: "Join SaaSy Land" })).toBeVisible()
  await expect(invitee.getByLabel("Email", { exact: true })).toHaveValue(email)
  expect(await accessibilityViolations(invitee)).toEqual([])
  await invitee.getByLabel("Name", { exact: true }).fill(INVITEE_NAME)
  await invitee.locator("#invite-password").fill(TEST_PASSWORD)
  await invitee.getByRole("button", { exact: true, name: "Create account" }).click()
  await expect(invitee).toHaveURL(/\/admin\/?$/u)
  await expect(invitee.getByText(email).first()).toBeVisible()

  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(rowOf(page, email)).toHaveCount(0)
  await invitee.context().close()
})

test("resending an invitation sends a new link, and the earlier one stops working", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  request,
}) => {
  await openInvitations({ appPage, authPage, page })
  const email = inviteeEmail()
  await invite(page, email, "Customer")
  const first = await expectInvitationEmail(request, email)

  await rowOf(page, email).getByRole("button", { name: `Actions for the invitation to ${email}` }).click()
  await page.getByRole("menuitem", { name: `Resend the invitation to ${email}` }).click()
  await expect(page.getByText(`A new link was sent to ${email}.`)).toBeVisible()
  const second = await expectInvitationEmail(request, email, 2)
  expect(second.toString()).not.toBe(first.toString())

  const stale = await openLink(browser, baseURL, first)
  await expect(stale.getByRole("heading", { level: 1, name: "This invitation link doesn't work" })).toBeVisible()
  await stale.context().close()
  const fresh = await openLink(browser, baseURL, second)
  await expect(fresh.getByRole("heading", { level: 1, name: "Join SaaSy Land" })).toBeVisible()
  await fresh.context().close()
})

test("revoking an invitation takes it off the list and its link says it was withdrawn", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  request,
}) => {
  await openInvitations({ appPage, authPage, page })
  const email = inviteeEmail()
  await invite(page, email, "Customer")
  const link = await expectInvitationEmail(request, email)

  await rowOf(page, email).getByRole("button", { name: `Actions for the invitation to ${email}` }).click()
  await page.getByRole("menuitem", { name: `Revoke the invitation to ${email}` }).click()
  await page.getByRole("alertdialog").getByRole("button", { exact: true, name: "Revoke invitation" }).click()
  await expect(page.getByText(`The invitation to ${email} was revoked.`)).toBeVisible()
  await expect(rowOf(page, email)).toHaveCount(0)

  const invitee = await openLink(browser, baseURL, link)
  await expect(invitee.getByRole("heading", { level: 1, name: "This invitation was withdrawn" })).toBeVisible()
  await invitee.context().close()
})

test("an expired invitation is marked on the list and its link asks for a new one", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  request,
}) => {
  await openInvitations({ appPage, authPage, page })
  const email = inviteeEmail()
  await invite(page, email, "Customer")
  const link = await expectInvitationEmail(request, email)

  const expired = await request.get("/__test/invitations/expire", { params: { email } })
  expect(await expired.json()).toEqual({ expired: 1 })
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(rowOf(page, email)).toContainText("Link expired")

  const invitee = await openLink(browser, baseURL, link)
  await expect(invitee.getByRole("heading", { level: 1, name: "This invitation has expired" })).toBeVisible()
  await invitee.context().close()
})

test("an invitee who continues with GitHub under the invited address comes back signed in and accepts the role", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  request,
}) => {
  await openInvitations({ appPage, authPage, page })
  const email = inviteeEmail()
  await invite(page, email, "Admin")

  const invitee = await openLink(browser, baseURL, await expectInvitationEmail(request, email), email)
  await continueWithGitHub(invitee)
  await expect(invitee.getByRole("heading", { level: 1, name: "Accept your invitation" })).toBeVisible()
  await expect(invitee.getByText(`You're signed in as ${email}.`, { exact: false })).toBeVisible()
  await invitee.getByRole("button", { exact: true, name: "Accept invitation" }).click()
  await expect(invitee).toHaveURL(/\/admin\/?$/u)

  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(rowOf(page, email)).toHaveCount(0)
  await invitee.context().close()
})

test("an invitee signed in with another address is told so, signs out and can then accept with the invited one", async ({
  appPage,
  authPage,
  baseURL,
  browser,
  page,
  request,
}) => {
  await openInvitations({ appPage, authPage, page })
  const email = inviteeEmail()
  const other = inviteeEmail()
  await invite(page, email, "Customer")

  const invitee = await openLink(browser, baseURL, await expectInvitationEmail(request, email), other)
  await continueWithGitHub(invitee)
  await expect(invitee.getByRole("heading", { level: 1, name: "This invitation is for another address" })).toBeVisible()
  await expect(invitee.getByText(other, { exact: false })).toBeVisible()
  await invitee.getByRole("button", { exact: true, name: "Sign out" }).click()
  await expect(invitee.getByRole("heading", { level: 1, name: "Join SaaSy Land" })).toBeVisible()
  await expect(invitee.getByLabel("Email", { exact: true })).toHaveValue(email)
  await invitee.context().close()
})

test("the admin searches the open invitations, filters them by role, hides a column and keeps the layout after a reload", async ({
  appPage,
  authPage,
  page,
}) => {
  await openInvitations({ appPage, authPage, page })
  const asAdmin = inviteeEmail()
  const asCustomer = inviteeEmail()
  await invite(page, asAdmin, "Admin")
  await invite(page, asCustomer, "Customer")
  const { table } = usersMessages.invitations
  const grid = gridOf(page, usersMessages.invitations.title)
  const rows = grid.locator("tbody tr")

  await grid.getByRole("searchbox", { name: usersMessages.invitations.search }).fill(asCustomer)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(asCustomer)
  await grid.getByRole("searchbox", { name: usersMessages.invitations.search }).fill("")
  await filterByOption(grid, table.role, usersMessages.filters.role.options.admin)
  await expect(rows.filter({ hasText: asAdmin })).toHaveCount(1)
  await expect(rows.filter({ hasText: asCustomer })).toHaveCount(0)
  await removeFilter(grid, table.role)

  const headerNames = grid.getByRole("columnheader")
  await hideColumn(grid, table.invitedBy)
  const arranged = ["", table.email, table.role, table.status, table.sentAt, table.expiresAt, gridMessages.actions.header]
  await expect(headerNames).toHaveText(arranged)
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(headerNames).toHaveText(arranged)
  await resetLayout(grid)
  await expect(headerNames).toHaveText([
    "",
    table.email,
    table.role,
    table.status,
    table.invitedBy,
    table.sentAt,
    table.expiresAt,
    gridMessages.actions.header,
  ])
})
