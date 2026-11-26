import type { Locator, Page } from "@playwright/test"

import labels from "../../messages/en-US/pages.admin.json" with { type: "json" }
import locales from "../../messages/en-US/locales.json" with { type: "json" }
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { ROUTES } from "../../src/routes"
import coursesMessages from "../../messages/en-US/pages.admin.courses.json" with { type: "json" }
import { TEST_COURSE, TEST_MATERIALS } from "../data/courses"
import { TEST_VIDEO } from "../data/videos"
import { expect, test } from "../fixtures/auth"
import {
  chooseRowAction,
  filterByOption,
  filteredEmpty,
  gridMessages,
  gridOf,
  hideColumn,
  removeFilter,
  resetLayout,
} from "../fixtures/data-grid"
import { dragOnto } from "../fixtures/drag"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin] = TEST_ACCOUNTS

const DRAG_STEPS = 10

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

const useLibraryVideo = async (page: Page): Promise<void> => {
  await chooseRowAction(page.getByRole("row", { name: "A first look" }), "Actions for A first look", "Edit")
  await page.getByRole("button", { name: "Use an existing video" }).click()
  await page.getByRole("dialog", { name: "Use an existing video" }).getByRole("button", { name: `Use ${TEST_VIDEO.title}` }).click()
  await expect(page.getByText("Video added to the lesson")).toBeVisible()
}

test("an administrator builds a course whose free lesson visitors can watch", async ({ appPage, authPage, browser, page }) => {
  const slug = `e2e-${crypto.randomUUID().slice(0, 8)}`
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value: string) => {
          document.documentElement.dataset["copiedLink"] = value
        },
      },
    })
  })
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
  await lessonDialog.getByRole("button", { name: "Save lesson" }).click()
  await expect(lessonDialog).toBeHidden()
  await useLibraryVideo(page)
  await page.getByRole("link", { name: "Shipping the first release" }).click()
  await expect(page.getByText(`${TEST_VIDEO.title} · 0:02`)).toBeVisible()

  const visitor = await browser.newPage()
  const playlist = visitor.waitForResponse((response) => response.url().endsWith(`/${TEST_VIDEO.id}/master.m3u8`))
  await visitor.goto(`/courses/${slug}/first-look`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(visitor.getByRole("heading", { level: 1, name: "A first look" })).toBeVisible()
  expect((await playlist).status()).toBe(200)
  await visitor.close()

  await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const row = page.getByRole("row").filter({ hasText: slug })
  const menu = "Actions for Shipping the first release"
  const opened = page.waitForEvent("popup")
  await chooseRowAction(row, menu, coursesMessages.actions.view)
  const publicPage = await opened
  await expect(publicPage).toHaveURL(new RegExp(`/courses/${slug}$`, "u"))
  await expect(publicPage.getByRole("heading", { level: 1, name: "Shipping the first release" })).toBeVisible()
  await publicPage.close()
  await chooseRowAction(row, menu, coursesMessages.actions.copyLink)
  await expect(page.getByText(coursesMessages.actions.copied)).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("data-copied-link", new URL(`/courses/${slug}`, page.url()).href)
  await chooseRowAction(row, menu, coursesMessages.actions.edit)
  await expect(page.getByRole("heading", { level: 1, name: "Shipping the first release" })).toBeVisible()

  await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await chooseRowAction(row, menu, coursesMessages.actions.delete)
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete course" }).click()
  await expect(page.getByText("“Shipping the first release” was deleted")).toBeVisible()
  await expect(page.getByRole("row").filter({ hasText: slug })).toHaveCount(0)
})

test("an administrator translates a course from one language control and visitors read it in their language", async ({ appPage, authPage, page }) => {
  const slug = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const languages = labels.components.formLanguages
  await signInAsAdmin(page, authPage)

  await page.goto("/admin/courses/create", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByLabel("Title", { exact: true }).fill("Shipping the first release")
  await page.getByLabel("Summary", { exact: true }).fill("From an empty repository to a paying customer.")
  await page.getByLabel("URL slug").fill(slug)
  await choose(page.locator("form"), "Status", "Published")

  await page.getByRole("button", { name: new RegExp(languages.label, "u") }).click()
  await page.getByRole("searchbox", { name: languages.search }).fill("pol")
  await page.getByRole("option", { name: /pl-PL/u }).click()
  await expect(page.getByText("Shipping the first release", { exact: true })).toBeVisible()
  await page.getByLabel("Title", { exact: true }).fill("Pierwsze wydanie")
  await page.getByLabel("Summary", { exact: true }).fill("Od pustego repozytorium do płacącego klienta.")

  await page.getByRole("button", { name: languages.panel.open }).click()
  const panel = page.getByRole("dialog", { name: languages.panel.title })
  await panel.getByRole("searchbox", { name: languages.panel.search }).fill("germ")
  await panel.getByLabel(locales["de-DE"], { exact: true }).fill("Die erste Version")
  await panel.getByRole("button", { name: languages.panel.done }).click()
  await expect(panel).toBeHidden()

  await page.getByRole("button", { name: "Create course" }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/[\da-f-]{36}$/u)

  await page.goto(`/pl-PL/courses/${slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(page.getByRole("heading", { level: 1, name: "Pierwsze wydanie" })).toBeVisible()
  await page.goto(`/de-DE/courses/${slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(page.getByRole("heading", { level: 1, name: "Die erste Version" })).toBeVisible()

  await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await chooseRowAction(page.getByRole("row").filter({ hasText: slug }), "Actions for Shipping the first release", "Delete")
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete course" }).click()
  await expect(page.getByRole("row").filter({ hasText: slug })).toHaveCount(0)
})

test("an administrator writes a lesson, swaps its video and adds materials that visitors download", async ({
  appPage,
  authPage,
  browser,
  page,
}) => {
  const slug = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const lessonPath = `/courses/${slug}/first-look`
  await signInAsAdmin(page, authPage)

  await page.goto("/admin/courses/create", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByLabel("Title", { exact: true }).fill("Materials and recordings")
  await page.getByLabel("Summary", { exact: true }).fill("A course to try the lesson editor.")
  await page.getByLabel("URL slug").fill(slug)
  await choose(page.locator("form"), "Status", "Published")
  await choose(page.locator("form"), "Level", "Intermediate")
  await page.getByRole("button", { name: "Add an outcome" }).click()
  await page.getByLabel("Outcome 1", { exact: true }).fill("Edit every part of a lesson")
  await page.getByRole("button", { name: "Create course" }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/[\da-f-]{36}$/u)

  await page.getByRole("button", { name: "Add chapter" }).click()
  const chapterDialog = page.getByRole("dialog")
  await chapterDialog.getByLabel("Chapter title").fill("Getting started")
  await chapterDialog.getByLabel("Summary", { exact: true }).fill("What the course covers.")
  await chapterDialog.getByRole("button", { name: "Save chapter" }).click()
  await expect(page.getByText("What the course covers.")).toBeVisible()

  await page.getByRole("button", { name: "Add lesson" }).click()
  const lessonDialog = page.getByRole("dialog")
  await lessonDialog.getByLabel("Lesson title").fill("A first look")
  await lessonDialog.getByLabel("Summary", { exact: true }).fill("What you are about to build.")
  await lessonDialog.getByLabel("URL slug").fill("first-look")
  await choose(lessonDialog, "Who can watch", "Everyone (free preview)")
  await choose(lessonDialog, "Status", "Published")
  await lessonDialog.getByRole("button", { name: "Save lesson" }).click()
  await expect(lessonDialog).toBeHidden()

  await chooseRowAction(page.getByRole("row", { name: "A first look" }), "Actions for A first look", "Edit")
  await expect(page.getByRole("heading", { level: 1, name: "A first look" })).toBeVisible()
  await page.getByLabel("Description", { exact: true }).fill("Open `src/modules` first.\n\nThen follow one table.")
  await expect(page.getByRole("region", { name: "Description preview" }).locator("code")).toHaveText("src/modules")
  await page.getByRole("button", { name: "Add a key moment" }).click()
  await page.getByLabel("Time of moment 1", { exact: true }).fill("0:01")
  await page.getByLabel("Label of moment 1", { exact: true }).fill("The modules folder")
  await page.getByRole("button", { name: "Save lesson" }).click()
  await expect(page.getByText("Lesson saved")).toBeVisible()

  await page.getByRole("button", { name: "Upload a file" }).click()
  const uploadDialog = page.getByRole("dialog")
  await uploadDialog.getByLabel("Title", { exact: true }).fill("Workbook")
  await uploadDialog.locator("input[type=file]").setInputFiles(TEST_MATERIALS[0].file)
  await uploadDialog.getByRole("button", { name: "Save material" }).click()
  await expect(uploadDialog).toBeHidden()
  await expect(page.getByText("workbook.pdf ·")).toBeVisible()

  await page.getByRole("button", { name: "Add a link" }).click()
  const linkDialog = page.getByRole("dialog")
  await linkDialog.getByLabel("Title", { exact: true }).fill("Course docs")
  await linkDialog.getByLabel("Link", { exact: true }).fill("/docs/features/courses")
  await linkDialog.getByRole("button", { name: "Save material" }).click()
  await expect(linkDialog).toBeHidden()

  const materialList = page.getByRole("grid", { name: "Materials" })
  await dragOnto(materialList.getByRole("row", { name: "Course docs" }), materialList.getByRole("row", { name: "Workbook" }), {
    from: { x: 16, y: 20 },
    to: { x: 40, y: 4 },
  })
  await expect.poll(() => materialList.getByRole("row").allTextContents()).toStrictEqual([
    expect.stringContaining("Course docs"),
    expect.stringContaining("Workbook"),
  ])

  const visitor = await browser.newPage()
  await visitor.goto(lessonPath, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(visitor.getByText("The recording for this lesson is on its way.")).toBeVisible()
  const download = await visitor.getByRole("region", { name: "Materials" }).getByRole("link", { name: "Workbook" }).getAttribute("href")
  expect((await visitor.request.get(download ?? "")).status()).toBe(200)
  await expect(visitor.getByRole("link", { name: "Course docs" })).toHaveAttribute("href", "/docs/features/courses")
  await expect(visitor.getByRole("region", { name: "Materials" }).getByRole("link").first()).toHaveAccessibleName("Course docs")

  await page.getByRole("button", { name: "Use an existing video" }).click()
  await page.getByRole("dialog", { name: "Use an existing video" }).getByRole("button", { name: `Use ${TEST_VIDEO.title}` }).click()
  await expect(page.getByText("Plays for everyone who may open the lesson")).toBeVisible()

  const playlist = visitor.waitForResponse((response) => response.url().endsWith(`/${TEST_VIDEO.id}/master.m3u8`))
  await visitor.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  expect((await playlist).status()).toBe(200)
  await visitor.close()

  await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await chooseRowAction(page.getByRole("row").filter({ hasText: slug }), "Actions for Materials and recordings", "Delete")
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete course" }).click()
  await expect(page.getByRole("row").filter({ hasText: slug })).toHaveCount(0)
  expect((await page.request.get(download ?? "")).status()).toBe(404)
})

test("an administrator finds a course by its slug, filters the catalogue by status, hides a column and keeps the layout after a reload", async ({
  appPage,
  authPage,
  page,
}) => {
  await signInAsAdmin(page, authPage)
  await page.goto(ROUTES.ADMIN.COURSES.INDEX, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const { headers } = coursesMessages.table
  const grid = gridOf(page, coursesMessages.title)
  const rows = grid.locator("tbody tr")

  await page.getByRole("searchbox", { name: coursesMessages.table.search }).fill(TEST_COURSE.slug)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText(TEST_COURSE.title["en-US"])
  await filterByOption(grid, headers.status, coursesMessages.form.statuses.draft)
  await expect(filteredEmpty(grid)).toBeVisible()
  await removeFilter(grid, headers.status)
  await expect(rows).toHaveCount(1)

  const headerNames = grid.getByRole("columnheader")
  await hideColumn(grid, headers.kind)
  const fixedHeaders = ["", gridMessages.rows.header, headers.position]
  const arranged = [...fixedHeaders, headers.course, headers.status, headers.lessons, headers.updated, gridMessages.actions.header]
  await expect(headerNames).toHaveText(arranged)
  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(headerNames).toHaveText(arranged)
  await resetLayout(grid)
  await expect(headerNames).toHaveText([
    ...fixedHeaders,
    headers.course,
    headers.kind,
    headers.status,
    headers.lessons,
    headers.updated,
    gridMessages.actions.header,
  ])
})

test("an administrator orders the catalogue by dragging a course and with the keyboard, then deletes the selected courses together", async ({
  appPage,
  authPage,
  browser,
  page,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8)
  const first = { slug: `e2e-${suffix}-a`, title: `Catalogue order ${suffix} a` }
  const second = { slug: `e2e-${suffix}-b`, title: `Catalogue order ${suffix} b` }
  await signInAsAdmin(page, authPage)
  for (const course of [first, second]) {
    await page.goto("/admin/courses/create", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await page.getByLabel("Title", { exact: true }).fill(course.title)
    await page.getByLabel("Summary", { exact: true }).fill("A course whose place in the catalogue is set by hand.")
    await page.getByLabel("URL slug").fill(course.slug)
    await choose(page.locator("form"), "Status", "Published")
    await page.getByRole("button", { name: "Create course" }).click()
    await expect(page).toHaveURL(/\/admin\/courses\/[\da-f-]{36}$/u)
  }

  await page.goto(ROUTES.ADMIN.COURSES.INDEX, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const grid = gridOf(page, coursesMessages.title)
  const rowOf = (course: { readonly slug: string }): Locator => grid.getByRole("row").filter({ hasText: course.slug })
  const rowIndex = (course: { readonly slug: string }): Promise<number> =>
    rowOf(course).evaluate((row: HTMLTableRowElement) => row.rowIndex)
  const isAbove = async (upper: { readonly slug: string }, lower: { readonly slug: string }): Promise<boolean> =>
    (await rowIndex(upper)) < (await rowIndex(lower))
  const staysAboveAfterReload = async (upper: { readonly slug: string }, lower: { readonly slug: string }): Promise<void> => {
    await expect(async () => {
      await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await appPage.waitForAppReady()
      expect(await isAbove(upper, lower)).toBe(true)
    }).toPass()
  }
  expect(await isAbove(first, second)).toBe(true)

  await rowOf(second).getByRole("button", { name: gridMessages.rows.handle }).dragTo(rowOf(first), { steps: DRAG_STEPS })
  await expect.poll(() => isAbove(second, first)).toBe(true)
  await staysAboveAfterReload(second, first)

  const visitor = await browser.newPage()
  await visitor.goto(ROUTES.COURSES, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(visitor.getByRole("link").filter({ hasText: suffix }).first()).toContainText(second.title)
  await visitor.close()

  const handle = rowOf(second).getByRole("button", { name: gridMessages.rows.handle })
  await expect(async () => {
    if (await isAbove(second, first)) {
      await handle.focus()
      await handle.press("ArrowDown")
      await expect(handle).toBeFocused()
    }
    expect(await isAbove(first, second)).toBe(true)
  }).toPass()
  await staysAboveAfterReload(first, second)

  for (const course of [first, second]) {
    await rowOf(course).getByRole("checkbox", { name: gridMessages.selection.selectRow }).focus()
    await page.keyboard.press("Space")
  }
  const bar = page.getByRole("region", { name: gridMessages.selection.region })
  await bar.getByRole("button", { name: "Delete 2 courses" }).click()
  const confirm = page.getByRole("alertdialog")
  await expect(confirm.getByRole("heading", { name: "Delete 2 courses?" })).toBeVisible()
  await confirm.getByRole("button", { name: "Delete 2 courses" }).click()
  await expect(page.getByText("2 courses were deleted")).toBeVisible()
  await expect(rowOf(first)).toHaveCount(0)
  await expect(rowOf(second)).toHaveCount(0)
})
