import type { Locator, Page } from "@playwright/test"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin] = TEST_ACCOUNTS

const COURSE_TITLE = "Ordered by hand"

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
  await expect(scope.page().getByRole("listbox")).toHaveCount(0)
}

const addChapter = async (page: Page, title: string): Promise<void> => {
  await page.getByRole("button", { name: "Add chapter" }).click()
  const dialog = page.getByRole("dialog", { name: "Add chapter" })
  await dialog.getByLabel("Chapter title").fill(title)
  await dialog.getByRole("button", { name: "Save chapter" }).click()
  await expect(dialog).toBeHidden()
}

const addLesson = async (page: Page, chapter: string, title: string): Promise<void> => {
  await page.getByRole("button", { name: `Add lesson to ${chapter}` }).click()
  const dialog = page.getByRole("dialog", { name: "Add lesson" })
  await dialog.getByLabel("Lesson title").fill(title)
  await dialog.getByLabel("Summary", { exact: true }).fill(`${title} summary.`)
  await dialog.getByLabel("URL slug").fill(title.toLowerCase())
  await choose(dialog, "Who can watch", "Everyone (free preview)")
  await choose(dialog, "Status", "Published")
  await dialog.getByRole("button", { name: "Save lesson" }).click()
  await expect(dialog).toBeHidden()
}

const curriculum = (page: Page): Locator => page.getByRole("grid", { name: "Curriculum" })

const order = async (page: Page): Promise<string[]> => curriculum(page).locator("[role=row] h3, [role=row] p.font-medium").allTextContents()

test("an administrator orders chapters and lessons by dragging them, a lesson into another chapter too, and visitors see the new order", async ({
  appPage,
  authPage,
  browser,
  page,
}) => {
  const slug = `e2e-${crypto.randomUUID().slice(0, 8)}`
  await signInAsAdmin(page, authPage)
  await page.goto("/admin/courses/create", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByLabel("Title", { exact: true }).fill(COURSE_TITLE)
  await page.getByLabel("Summary", { exact: true }).fill("A course whose curriculum is ordered by dragging.")
  await page.getByLabel("URL slug").fill(slug)
  await choose(page.locator("form"), "Status", "Published")
  await page.getByRole("button", { name: "Create course" }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/[\da-f-]{36}$/u)
  await addChapter(page, "Basics")
  await addChapter(page, "Shipping")
  await addLesson(page, "Basics", "Install")
  await addLesson(page, "Basics", "Deploy")
  await addLesson(page, "Shipping", "Monitor")
  await expect.poll(() => order(page)).toStrictEqual(["Basics", "Install", "Deploy", "Shipping", "Monitor"])

  const deploy = curriculum(page).getByRole("row", { name: "Deploy" })
  const monitor = curriculum(page).getByRole("row", { name: "Monitor" })
  await deploy.dragTo(monitor, { sourcePosition: { x: 24, y: 16 }, targetPosition: { x: 40, y: 4 } })
  await expect.poll(() => order(page)).toStrictEqual(["Basics", "Install", "Shipping", "Deploy", "Monitor"])

  await curriculum(page).getByRole("row", { name: "Shipping" }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("button", { name: "Drag Shipping" })).toBeFocused()
  await page.keyboard.press("Enter")
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("Enter")
  await expect.poll(() => order(page)).toStrictEqual(["Shipping", "Deploy", "Monitor", "Basics", "Install"])

  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect.poll(() => order(page)).toStrictEqual(["Shipping", "Deploy", "Monitor", "Basics", "Install"])

  const visitor = await browser.newPage()
  await visitor.goto(`/courses/${slug}/install`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  const neighbours = visitor.getByRole("navigation", { name: "Previous and next lessons" })
  await expect(neighbours.getByRole("link", { name: /Monitor/u })).toBeVisible()
  await visitor.close()

  await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByRole("row").filter({ hasText: slug }).getByRole("button", { name: `Delete ${COURSE_TITLE}` }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete course" }).click()
  await expect(page.getByRole("row").filter({ hasText: slug })).toHaveCount(0)
})
