import type { Page } from "@playwright/test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { courseZodSchemas } from "../../src/modules/course/course.zod"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import type { AuthPage, BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const CURRICULUM_PATH = "content/courses/saasy-land-courses.json"
const PLAN_TITLE = "Importing this file will make these changes:"
const NO_CHANGES = "Nothing to import: the courses here already match the file."

const [admin] = TEST_ACCOUNTS
const curriculum = courseZodSchemas.courseDocument.parse(JSON.parse(readFileSync(CURRICULUM_PATH, "utf8")))
const [firstCourse] = curriculum.courses

const signInAsAdmin = async (page: Page, authPage: AuthPage): Promise<void> => {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
  await authPage.gotoSignIn()
  await authPage.emailField().fill(admin.email)
  await authPage.passwordField().fill(TEST_PASSWORD)
  await authPage.signInSubmitButton().click()
  await expect(page).toHaveURL(/\/admin\/?$/u)
}

const checkCurriculum = async (page: Page, appPage: BasePage) => {
  await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByRole("button", { name: "Import", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Uploaded materials do not travel in it", { exact: false })).toBeVisible()
  await dialog.locator("input[type=file]").setInputFiles(CURRICULUM_PATH)
  await expect(dialog.getByText("saasy-land-courses.json")).toBeVisible()
  await dialog.getByRole("button", { name: "Check file" }).click()
  await expect(dialog.getByText(PLAN_TITLE).or(dialog.getByText(NO_CHANGES))).toBeVisible()
  return dialog
}

test("an administrator imports the curriculum, visitors see it being recorded, and a second import changes nothing", async ({
  appPage,
  authPage,
  page,
}) => {
  assert(firstCourse)
  await signInAsAdmin(page, authPage)

  const dialog = await checkCurriculum(page, appPage)
  if (await dialog.getByText(PLAN_TITLE).isVisible()) {
    await expect(dialog.getByText(/^5 to add, 0 to update, 0 unchanged, 0 to remove, \d+ not in the file and kept$/u)).toBeVisible()
    await expect(dialog.getByText("74 to add, 0 to update, 0 unchanged, 0 to remove, 0 not in the file and kept")).toBeVisible()
    await dialog.getByRole("button", { name: "Import", exact: true }).click()
    await expect(page.getByText("Courses imported")).toBeVisible()
    await expect(dialog).toBeHidden()
  }

  await page.goto("/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  for (const course of curriculum.courses) {
    await expect(page.getByRole("link", { name: new RegExp(course.title["en-US"] ?? "", "u") })).toBeVisible()
  }
  await page.getByRole("link", { name: new RegExp(firstCourse.title["en-US"] ?? "", "u") }).click()
  await expect(page).toHaveURL(`/courses/${firstCourse.slug}`)
  await expect(page.getByText("This course is being recorded.", { exact: false })).toBeVisible()
  await expect(page.getByRole("link", { name: "Start the course" })).toHaveCount(0)

  const again = await checkCurriculum(page, appPage)
  await expect(again.getByText(NO_CHANGES)).toBeVisible()
  await expect(again.getByRole("button", { name: "Import", exact: true })).toBeDisabled()
})
