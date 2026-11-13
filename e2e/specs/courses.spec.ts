import type { Page } from "@playwright/test"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { expect, test } from "../fixtures/test"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin, customer] = TEST_ACCOUNTS
const [preview, account, paid] = TEST_LESSONS

const lessonPath = (slug: string): string => `/courses/${TEST_COURSE.slug}/${slug}`

const useOwnRateLimit = async (page: Page): Promise<void> => {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
}

const signIn = async (page: Page, authPage: AuthPage, email: string): Promise<void> => {
  await authPage.emailField().fill(email)
  await authPage.passwordField().fill(TEST_PASSWORD)
  await authPage.signInSubmitButton().click()
}

const signedPlaylist = (page: Page) => page.waitForResponse((response) => /\/media\/[\da-z]+\.[\da-f]{64}\/.+\/master\.m3u8$/u.test(response.url()))

test.describe("courses", () => {
  test.beforeEach(async ({ page }) => {
    await useOwnRateLimit(page)
  })

  test("a visitor finds the course and watches its free lesson", async ({ page }) => {
    await page.goto("/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await page.getByRole("link", { name: new RegExp(TEST_COURSE.title["en-US"], "u") }).click()
    await expect(page).toHaveURL(`/courses/${TEST_COURSE.slug}`)

    const playlist = signedPlaylist(page)
    await page.getByRole("link", { name: "Start the course" }).click()
    await expect(page).toHaveURL(lessonPath(preview.slug))
    expect((await playlist).status()).toBe(200)
    await expect(page.getByRole("heading", { level: 1, name: preview.title["en-US"] })).toBeVisible()
  })

  test("a visitor signs in from an account lesson and comes back to watch it", async ({ authPage, page }) => {
    await page.goto(lessonPath(account.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await page.getByRole("link", { name: "Sign in to watch" }).click()

    const playlist = signedPlaylist(page)
    await signIn(page, authPage, customer.email)
    await expect(page).toHaveURL(lessonPath(account.slug))
    expect((await playlist).status()).toBe(200)
  })

  test("a customer without Complete is offered it on a paid lesson", async ({ authPage, page }) => {
    await authPage.gotoSignIn()
    await signIn(page, authPage, customer.email)
    await expect(page).toHaveURL("/app")

    await page.goto(lessonPath(paid.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await expect(page.getByRole("heading", { name: "This lesson comes with Complete" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Get Complete" })).toHaveAttribute("href", "/app/license")
  })

  test("an administrator can watch every lesson", async ({ authPage, page }) => {
    await authPage.gotoSignIn()
    await signIn(page, authPage, admin.email)
    await expect(page).toHaveURL("/admin")

    const playlist = signedPlaylist(page)
    await page.goto(lessonPath(paid.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    expect((await playlist).status()).toBe(200)
    await expect(page.getByRole("button", { name: "Mark as complete" })).toBeVisible()
  })
})
