import type { Locator, Page } from "@playwright/test"

import * as ROUTES from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import type { AuthPage, BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"
import { chooseRowAction } from "./data-grid"
import { expect } from "./test"

const [admin] = TEST_ACCOUNTS

export const COURSE_EDITOR_PATH = /\/admin\/courses\/(?<courseId>[\da-f-]{36})$/u

export interface DraftCourse {
  readonly slug: string
  readonly status?: string
  readonly title: string
}

export interface DraftLesson {
  readonly access?: string
  readonly slug: string
  readonly status?: string
  readonly title: string
}

export const newSlug = (): string => `e2e-${crypto.randomUUID().slice(0, 8)}`

export const signInAsAdmin = async (page: Page, authPage: AuthPage): Promise<void> => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
}

export const choose = async (scope: Locator, label: string, option: string): Promise<void> => {
  await scope.getByRole("button", { name: new RegExp(label, "u") }).click()
  await scope.page().getByRole("option", { exact: true, name: option }).click()
  await expect(scope.page().getByRole("listbox")).toHaveCount(0)
}

export const fillCourse = async (page: Page, { slug, status = "Published", title }: DraftCourse): Promise<void> => {
  await page.getByLabel("Title", { exact: true }).fill(title)
  await page.getByLabel("Summary", { exact: true }).fill("A course the end-to-end suite builds and removes.")
  await page.getByLabel("URL slug").fill(slug)
  await choose(page.locator("form"), "Status", status)
}

export const createCourse = async (page: Page, appPage: BasePage, course: DraftCourse): Promise<string> => {
  await page.goto(ROUTES.ADMIN_COURSES_CREATE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await fillCourse(page, course)
  await page.getByRole("button", { name: "Create course" }).click()
  await expect(page).toHaveURL(COURSE_EDITOR_PATH)
  await appPage.waitForAppReady()

  return COURSE_EDITOR_PATH.exec(new URL(page.url()).pathname)?.groups?.["courseId"] ?? ""
}

const DIALOG_OPEN_TIMEOUT_MS = 2000

const openDialog = async (trigger: Locator, dialog: Locator): Promise<void> => {
  await expect(async () => {
    if (!(await dialog.isVisible())) {
      await trigger.click()
    }
    await expect(dialog).toBeVisible({ timeout: DIALOG_OPEN_TIMEOUT_MS })
  }).toPass()
}

export const addChapter = async (page: Page, title: string): Promise<void> => {
  const dialog = page.getByRole("dialog", { name: "Add chapter" })
  await openDialog(page.getByRole("button", { exact: true, name: "Add chapter" }), dialog)
  await dialog.getByLabel("Chapter title").fill(title)
  await dialog.getByRole("button", { name: "Save chapter" }).click()
  await expect(dialog).toBeHidden()
}

export const addLesson = async (
  page: Page,
  chapter: string,
  { access = "Everyone (free preview)", slug, status = "Published", title }: DraftLesson,
): Promise<Locator> => {
  const dialog = page.getByRole("dialog", { name: "Add lesson" })
  await openDialog(page.getByRole("button", { exact: true, name: `Add lesson to ${chapter}` }), dialog)
  await dialog.getByLabel("Lesson title").fill(title)
  await dialog.getByLabel("Summary", { exact: true }).fill("A lesson the end-to-end suite builds and removes.")
  await dialog.getByLabel("URL slug").fill(slug)
  await choose(dialog, "Who can watch", access)
  await choose(dialog, "Status", status)
  await dialog.getByRole("button", { name: "Save lesson" }).click()

  return dialog
}

export const deleteCourse = async (page: Page, appPage: BasePage, { slug, title }: DraftCourse): Promise<void> => {
  await page.goto(ROUTES.ADMIN_COURSES, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const row = page.getByRole("row").filter({ hasText: slug })
  await chooseRowAction(row, `Actions for ${title}`, "Delete")
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete course" }).click()
  await expect(row).toHaveCount(0)
}
