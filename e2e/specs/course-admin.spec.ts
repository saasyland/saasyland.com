import type { Locator, Page } from "@playwright/test"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_VIDEO } from "../data/videos"
import { expect, test } from "../fixtures/test"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin] = TEST_ACCOUNTS

const signInAsAdmin = async (page: Page, authPage: AuthPage): Promise<void> => {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
  await authPage.gotoSignIn()
  await authPage.emailField().fill(admin.email)
  await authPage.passwordField().fill(TEST_PASSWORD)
  await authPage.signInSubmitButton().click()
  await expect(page).toHaveURL(/\/admin\/?$/u)
}

const choose = async (scope: Locator, label: string, option: string): Promise<void> => {
  await scope.getByRole("button", { name: new RegExp(label, "u") }).click()
  await scope.page().getByRole("option", { name: option, exact: true }).click()
}

test("an administrator builds a course whose free lesson visitors can watch", async ({ appPage, authPage, browser, page }) => {
  const slug = `e2e-${crypto.randomUUID().slice(0, 8)}`
  await signInAsAdmin(page, authPage)

  await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByRole("link", { name: "New course" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "New course" })).toBeVisible()
  await page.getByLabel("Title", { exact: true }).fill("Shipping the first release")
  await page.getByLabel("Summary", { exact: true }).fill("From an empty repository to a paying customer.")
  await page.getByLabel("URL slug").fill(slug)
  await choose(page.locator("form"), "Status", "Published")
  await page.getByRole("button", { name: "Create course" }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/[\da-f-]{36}$/u)
  await expect(page.getByRole("heading", { level: 1, name: "Shipping the first release" })).toBeVisible()

  await page.getByRole("button", { name: "Add chapter" }).click()
  const chapterDialog = page.getByRole("dialog")
  await chapterDialog.getByLabel("Chapter title").fill("Getting started")
  await chapterDialog.getByRole("button", { name: "Save chapter" }).click()
  await expect(chapterDialog).toBeHidden()
  await expect(page.getByRole("heading", { level: 3, name: "Getting started" })).toBeVisible()

  await page.getByRole("button", { name: "Add lesson" }).click()
  const lessonDialog = page.getByRole("dialog")
  await lessonDialog.getByLabel("Lesson title").fill("A first look")
  await lessonDialog.getByLabel("Summary", { exact: true }).fill("What you are about to build.")
  await lessonDialog.getByLabel("URL slug").fill("first-look")
  await choose(lessonDialog, "Who can watch", "Everyone (free preview)")
  await choose(lessonDialog, "Status", "Published")
  await choose(lessonDialog, "Video", `${TEST_VIDEO.title} · 0:02`)
  await lessonDialog.getByRole("button", { name: "Save lesson" }).click()
  await expect(lessonDialog).toBeHidden()
  await expect(page.getByText(`${TEST_VIDEO.title} · 0:02`)).toBeVisible()

  const visitor = await browser.newPage()
  const playlist = visitor.waitForResponse((response) => response.url().endsWith(`/${TEST_VIDEO.id}/master.m3u8`))
  await visitor.goto(`/courses/${slug}/first-look`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(visitor.getByRole("heading", { level: 1, name: "A first look" })).toBeVisible()
  expect((await playlist).status()).toBe(200)
  await visitor.close()

  await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByRole("row").filter({ hasText: slug }).getByRole("button", { name: "Delete Shipping the first release" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete course" }).click()
  await expect(page.getByText("“Shipping the first release” was deleted")).toBeVisible()
  await expect(page.getByRole("row").filter({ hasText: slug })).toHaveCount(0)
})
