import { readFile } from "node:fs/promises"

import type { APIRequestContext, Page } from "@playwright/test"
import * as zod from "zod"

import { EMAIL_HEADER, ONE_CLICK_UNSUBSCRIBE } from "../../src/integrations/resend/resend.constants"
import { NEWSLETTER_STATUS, NEWSLETTER_STATUSES } from "../../src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import * as ROUTES from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_NEWSLETTER_READERS } from "../data/newsletter"
import { expect, test } from "../fixtures/auth"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL, type BasePage } from "../pages/base-page"
import gridMessages from "../../messages/en-US/components.custom.data-grid.json" with { type: "json" }
import adminMessages from "../../messages/en-US/pages.admin.json" with { type: "json" }
import composeMessages from "../../messages/en-US/pages.admin.newsletter.compose.json" with { type: "json" }
import navigationMessages from "../../messages/en-US/navigation.newsletter.json" with { type: "json" }
import newsletterMessages from "../../messages/en-US/pages.admin.newsletter.json" with { type: "json" }

const [admin] = TEST_ACCOUNTS
const [reader, formulaReader] = TEST_NEWSLETTER_READERS
const { subscribers, issues } = newsletterMessages

const emailsSchema = zod.array(
  zod.object({ headers: zod.record(zod.string(), zod.string()), html: zod.string(), subject: zod.string() }),
)
const subscriberSchema = zod.object({ status: zod.enum(NEWSLETTER_STATUSES), unsubscribeToken: zod.string() })

const readEmails = async (request: APIRequestContext, recipient: string) => {
  const response = await request.get("/__test/emails", { params: { to: recipient } })
  expect(response.ok()).toBe(true)
  return emailsSchema.parse(await response.json())
}

const readSubscriber = async (request: APIRequestContext, email: string) => {
  const response = await request.get("/__test/newsletter", { params: { email } })
  expect(response.ok()).toBe(true)
  return subscriberSchema.parse(await response.json())
}

const signInAsAdmin = async ({ appPage, authPage, page }: { appPage: BasePage; authPage: AuthPage; page: Page }): Promise<void> => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await appPage.waitForAppReady()
}

const subscribeInPolish = async ({ appPage, page, request }: { appPage: BasePage; page: Page; request: APIRequestContext }) => {
  const id = crypto.randomUUID()
  const email = `newsletter.issue.${id}@example.test`
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${id.slice(0, 4)}::1` })
  await page.goto("/pl-PL", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const footer = page.getByRole("contentinfo")
  const emailField = footer.getByRole("textbox", { exact: true, name: "Adres e-mail" })
  await emailField.scrollIntoViewIfNeeded()
  await emailField.fill(email)
  await footer.getByRole("button", { exact: true, name: "Zapisz się" }).click()
  await expect.poll(async () => (await readEmails(request, email)).length).toBe(1)
  const link = (await readEmails(request, email))[0]?.html.match(/href="([^"]*\/newsletter\/confirm\?token=[^"]+)"/u)?.[1]
  if (link === undefined) throw new Error("The newsletter email has no confirmation link")
  await page.goto(link.replaceAll("&amp;", "&"), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByRole("button", { exact: true, name: "Potwierdź zapis" }).click()
  await expect.poll(async () => (await readSubscriber(request, email)).status).toBe(NEWSLETTER_STATUS.SUBSCRIBED)
  await page.setExtraHTTPHeaders({})
  return email
}

test("the admin finds a subscriber and exports the list to a CSV that keeps a formula-like address as text", async ({
  appPage,
  authPage,
  page,
}) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.getByRole("link", { exact: true, name: navigationMessages.admin.newsletter }).first().click()
  await expect(page).toHaveURL(ROUTES.ADMIN_NEWSLETTER)
  await appPage.waitForAppReady()

  await page.getByRole("searchbox", { name: subscribers.search }).fill("formula.reader")
  const rows = page.getByRole("table", { name: subscribers.title }).locator("tbody tr")
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText(formulaReader.email)
  await expect(rows.first()).toContainText(subscribers.status.pending)
  await expect(rows.first()).toContainText(subscribers.notConfirmed)

  const downloading = page.waitForEvent("download")
  await page.getByRole("button", { name: gridMessages.toolbar.export }).click()
  const download = await downloading
  const lines = (await readFile(await download.path(), "utf8")).replace(/^﻿/u, "").trim().split("\r\n")

  expect(download.suggestedFilename()).toMatch(/^newsletter-subscribers-\d{4}-\d{2}-\d{2}\.csv$/u)
  expect(lines).toHaveLength(2)
  expect(lines[1]).toMatch(new RegExp(`^'${formulaReader.email},${subscribers.status.pending},`, "u"))
})

test("the admin sends an issue in two languages, each confirmed subscriber gets it once in their language and can unsubscribe in one click", async ({
  appPage,
  authPage,
  page,
  request,
}) => {
  const polishReader = await subscribeInPolish({ appPage, page, request })
  const subject = `Build log ${crypto.randomUUID()}`
  const polishSubject = `Dziennik ${subject}`

  await signInAsAdmin({ appPage, authPage, page })
  await page.goto(ROUTES.ADMIN_NEWSLETTER_ISSUES, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByRole("link", { name: newsletterMessages.newIssue }).click()
  await expect(page).toHaveURL(ROUTES.ADMIN_NEWSLETTER_COMPOSE)
  await appPage.waitForAppReady()

  await page.getByLabel(composeMessages.form.subject).fill(subject)
  await page.getByLabel(composeMessages.form.body).fill("What shipped this week.\n\nWhat comes next.")
  await page.getByRole("button", { name: new RegExp(adminMessages.components.formLanguages.label, "u") }).click()
  await page.getByRole("option", { name: /pl-PL/u }).click()
  await page.getByLabel(composeMessages.form.subject).fill(polishSubject)
  await page.getByLabel(composeMessages.form.body).fill("Co weszło w tym tygodniu.")
  const preview = page.getByRole("region", { name: composeMessages.preview.title })
  await expect(preview).toContainText(polishSubject)

  await page.getByRole("button", { name: composeMessages.form.send }).click()
  const dialog = page.getByRole("alertdialog", { name: composeMessages.confirm.title })
  await dialog.getByRole("button", { name: composeMessages.confirm.send }).click()
  await expect(page).toHaveURL(ROUTES.ADMIN_NEWSLETTER_ISSUES)
  const row = page.getByRole("row").filter({ hasText: subject })
  await expect(row).toContainText(issues.status.sent)

  const issueFor = async (recipient: string, title: string) => (await readEmails(request, recipient)).filter((email) => email.subject === title)
  await expect.poll(async () => (await issueFor(reader.email, subject)).length).toBe(1)
  await expect.poll(async () => (await issueFor(polishReader, polishSubject)).length).toBe(1)
  expect(await issueFor(formulaReader.email, subject)).toHaveLength(0)

  const [polishIssue] = await issueFor(polishReader, polishSubject)
  expect(polishIssue?.html).toContain('lang="pl-PL"')
  expect(polishIssue?.html).toContain("Co weszło w tym tygodniu.")
  expect(polishIssue?.headers[EMAIL_HEADER.LIST_UNSUBSCRIBE_POST]).toBe(ONE_CLICK_UNSUBSCRIBE)
  const oneClick = polishIssue?.headers[EMAIL_HEADER.LIST_UNSUBSCRIBE]?.replace(/^<|>$/gu, "") ?? ""
  expect(new URL(oneClick).pathname).toBe("/pl-PL/newsletter/unsubscribe")
  expect(polishIssue?.html).toContain(`href="${oneClick.replaceAll("&", "&amp;")}"`)

  const unsubscribed = await request.post(oneClick, {
    data: ONE_CLICK_UNSUBSCRIBE,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
  expect(unsubscribed.ok()).toBe(true)
  await expect.poll(async () => (await readSubscriber(request, polishReader)).status).toBe(NEWSLETTER_STATUS.UNSUBSCRIBED)
  expect((await readSubscriber(request, reader.email)).status).toBe(NEWSLETTER_STATUS.SUBSCRIBED)
})
