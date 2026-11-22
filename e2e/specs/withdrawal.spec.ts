import type { APIRequestContext, Page } from "@playwright/test"
import * as zod from "zod"

import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { COLOR_SCHEMES, accessibilityViolations } from "../fixtures/accessibility"
import { expect, test } from "../fixtures/auth"
import {
  expectPurchaseConfirmation,
  expectVerificationEmail,
  expectWithdrawalAcknowledgement,
  expectWithdrawalNotification,
} from "../fixtures/emails"
import { buyLicense } from "../fixtures/license"
import type { AuthPage } from "../pages"
import type { BasePage } from "../pages/base-page"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import { CONTACT_EMAIL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"

const [admin] = TEST_ACCOUNTS
const BUYER_NAME = "Withdrawing Buyer"
const SIGN_UP_PASSWORD = "StrongPassword123!"
const ORDER_REFERENCE = /Order (?<reference>[^\s<]+) ·/u

const [preview, , paid] = TEST_LESSONS
const NOT_USED_YET =
  /^You asked for immediate supply at checkout, so the right of withdrawal ended when your licence key was issued\. You have not used the purchase yet, so a withdrawal until .+ still gets you a full refund under the Refund Policy\.$/u
const USED_IN_A_LESSON =
  /^You asked for immediate supply at checkout, so the right of withdrawal ended when your licence key was issued, and you first used the purchase on (?<date>.+), when you opened a paid lesson\. You can still send a withdrawal statement, and we will reply\.$/u
const ANY_SPACE = /\s/gu

const sessionSchema = zod.object({ user: zod.object({ id: zod.string() }) })

const DATE_TIME = new Intl.DateTimeFormat(I18N.DEFAULT_LOCALE, {
  ...I18N.FORMATS.dateTime.date,
  ...I18N.FORMATS.dateTime.time,
  timeZone: I18N.DEFAULT_TIMEZONE,
})

const printedAs = (value: Date): string => DATE_TIME.format(value).replaceAll(ANY_SPACE, " ")

const useOwnRateLimit = async (page: Page): Promise<string> => {
  const id = crypto.randomUUID()
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${id.slice(0, 4)}::` })
  return id
}

const signUpBuyer = async ({ authPage, page, request }: { authPage: AuthPage; page: Page; request: APIRequestContext }) => {
  const id = await useOwnRateLimit(page)
  const email = `withdrawal.${id}@example.test`
  await authPage.gotoSignUp()
  await authPage.nameField().fill(BUYER_NAME)
  await authPage.emailField().fill(email)
  await authPage.signUpPasswordField().fill(SIGN_UP_PASSWORD)
  await authPage.signUpSubmitButton().click()
  await expect(page).not.toHaveURL(/\/auth\//u)
  const session = sessionSchema.parse(await (await page.request.get("/api/auth/get-session")).json())
  await page.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

  return { email, userId: session.user.id }
}

const purchaseLinks = async (request: APIRequestContext, email: string) => {
  const confirmation = await expectPurchaseConfirmation(request, email)
  const reference = ORDER_REFERENCE.exec(confirmation)?.groups?.["reference"]
  const withdrawal = [...confirmation.matchAll(/href="([^"]+)"/gu)]
    .map(([, href]) => new URL((href ?? "").replaceAll("&amp;", "&")))
    .find(({ pathname }) => pathname === ROUTES.WITHDRAWAL)
  if (reference === undefined || withdrawal === undefined) {
    throw new Error("The purchase confirmation names no order or links no withdrawal function")
  }

  return { reference, withdrawal }
}

const statementForm = (page: Page) => page.locator("form").filter({ has: page.getByRole("button", { name: "Confirm withdrawal" }) })

const expectAccessible = async (page: Page): Promise<void> => {
  for (const colorScheme of COLOR_SCHEMES) {
    await page.emulateMedia({ colorScheme })
    expect(await accessibilityViolations(page)).toEqual([])
  }
}

const withdrawalCard = (page: Page) =>
  page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { level: 2, name: "Withdrawal" }) })

const visit = async (appPage: BasePage, page: Page, path: string): Promise<void> => {
  await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const openLesson = async (appPage: BasePage, page: Page, lesson: (typeof TEST_LESSONS)[number]): Promise<void> => {
  await visit(appPage, page, `${ROUTES.COURSES}/${TEST_COURSE.slug}/${lesson.slug}`)
  await expect(page.getByRole("heading", { level: 1, name: lesson.title["en-US"] })).toBeVisible()
  await expect(page.getByRole("button", { name: "Mark as complete" })).toBeVisible()
}

const openWithdrawalPage = async (appPage: BasePage, page: Page, url: string): Promise<void> => {
  await page.goto(url, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await appPage.waitForHydration(statementForm(page))
}

test.describe("withdrawal function", () => {
  test("a signed-out buyer withdraws through the link in the purchase confirmation and gets the acknowledgement by email", async ({
    appPage,
    authPage,
    context,
    page,
    request,
  }) => {
    const { email, userId } = await signUpBuyer({ authPage, page, request })
    await buyLicense(request, { tier: LICENSE_TIER.CORE, userId })
    const { reference, withdrawal } = await purchaseLinks(request, email)
    await context.clearCookies()

    await openWithdrawalPage(appPage, page, withdrawal.toString())
    await expect(page.getByRole("heading", { level: 1, name: "Withdraw from a contract" })).toBeVisible()
    await expectAccessible(page)
    const form = statementForm(page)
    await form.getByRole("textbox", { name: "Your name" }).fill(BUYER_NAME)
    await form.getByRole("textbox", { name: "Email for the acknowledgement" }).fill(email)
    await form.getByRole("textbox", { name: "Order number" }).fill(reference)
    await form.getByRole("button", { name: "Confirm withdrawal" }).click()

    const receipt = page.getByRole("heading", { level: 3, name: "We received your withdrawal" })
    await expect(receipt).toBeFocused()
    await expect(page.getByText(/^We received your withdrawal statement on .+ UTC\.$/u)).toBeVisible()
    await expect(page.getByText(`We emailed the acknowledgement of receipt, with this statement and the date and time of its submission, to ${email}.`)).toBeVisible()
    await expect(page.getByRole("definition").filter({ hasText: reference })).toBeVisible()
    await expectAccessible(page)

    const acknowledgement = await expectWithdrawalAcknowledgement(request, email)
    for (const value of [BUYER_NAME, reference, email, "I hereby give notice that I withdraw from my contract for the purchase identified below.", "UTC"]) {
      expect(acknowledgement).toContain(value)
    }
    const notification = await expectWithdrawalNotification(request, CONTACT_EMAIL, reference)
    expect(notification).toContain("Active Core licence")
    expect(notification).toContain("The order number and email address, without signing in")
    expect(notification).toContain(`${ROUTES.ADMIN_USERS}/${userId}`)
  })

  test("a signed-in buyer withdraws from the licence page with the account's details filled in, and the admin sees the statement", async ({
    appPage,
    authPage,
    context,
    page,
    request,
  }) => {
    const { email, userId } = await signUpBuyer({ authPage, page, request })
    await buyLicense(request, { tier: LICENSE_TIER.COMPLETE, userId })
    await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    const card = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { level: 2, name: "Withdrawal" }) })
    await expect(card.getByText(/^Complete licence · order .+ · bought on /u)).toBeVisible()
    await expect(card.getByText(/^You asked for immediate supply at checkout, so the right of withdrawal ended/u)).toBeVisible()
    await appPage.waitForHydration(card)
    await card.getByRole("button", { name: "Withdraw from contract here" }).click()

    const dialog = page.getByRole("dialog", { name: "Online withdrawal statement" })
    await expect(dialog.getByRole("textbox", { name: "Your name" })).toHaveValue(BUYER_NAME)
    await expect(dialog.getByRole("textbox", { name: "Email for the acknowledgement" })).toHaveValue(email)
    const reference = await dialog.getByRole("textbox", { name: "Order number" }).inputValue()
    expect(reference).not.toBe("")
    await expectAccessible(page)
    await dialog.getByRole("button", { name: "Confirm withdrawal" }).click()

    await expect(dialog.getByRole("heading", { level: 3, name: "We received your withdrawal" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(card.getByRole("status")).toHaveText(/^We received your withdrawal statement on .+ UTC\. We will reply by email\.$/u)

    expect(await expectWithdrawalAcknowledgement(request, email)).toContain(reference)
    expect(await expectWithdrawalNotification(request, CONTACT_EMAIL, reference)).toContain("Their signed-in account")

    await context.clearCookies()
    await authPage.signIn(admin.email)
    await expect(page).toHaveURL(/\/admin\/?$/u)
    await page.goto(`${ROUTES.ADMIN_USERS}/${userId}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const statements = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { name: "Withdrawal statements" }) })
    await expect(statements.getByText(/^Received /u)).toBeVisible()
    await expect(statements.getByRole("definition").filter({ hasText: "The signed-in account" })).toBeVisible()
    await expect(statements.getByRole("definition").filter({ hasText: /^Refundable\. The buyer consented to immediate delivery/u })).toBeVisible()
    await expect(statements.getByRole("definition").filter({ hasText: /^Emailed / })).toBeVisible()
  })

  test("a buyer who opens a paid lesson has used the purchase from that moment, and a free preview does not count", async ({
    appPage,
    authPage,
    page,
    request,
  }) => {
    const { userId } = await signUpBuyer({ authPage, page, request })
    await buyLicense(request, { tier: LICENSE_TIER.COMPLETE, userId })

    await openLesson(appPage, page, preview)
    await visit(appPage, page, ROUTES.APP_LICENSE)
    await expect(withdrawalCard(page).getByText(NOT_USED_YET)).toBeVisible()

    const openedFrom = new Date()
    await openLesson(appPage, page, paid)
    const openedUntil = new Date()
    await visit(appPage, page, ROUTES.APP_LICENSE)

    const terms = withdrawalCard(page).getByText(USED_IN_A_LESSON)
    await expect(terms).toBeVisible()
    const printed = USED_IN_A_LESSON.exec((await terms.textContent()) ?? "")?.groups?.["date"]?.replaceAll(ANY_SPACE, " ")
    expect([printedAs(openedFrom), printedAs(openedUntil)]).toContain(printed)
  })

  test("the footer of every page and the Refund Policy lead to the withdrawal function", async ({ appPage, page }) => {
    await page.goto(ROUTES.REFUNDS, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Withdraw from contract here" })).toHaveAttribute("href", ROUTES.WITHDRAWAL)
    const policy = page.getByRole("main").getByRole("link", { name: "Withdraw from contract here" })
    await appPage.waitForHydration(policy)
    await policy.click()

    await expect(page).toHaveURL(ROUTES.WITHDRAWAL)
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1, name: "Withdraw from a contract" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Confirm withdrawal" })).toBeVisible()
  })
})
