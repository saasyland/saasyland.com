import { readFile, writeFile } from "node:fs/promises"

import type { Browser, Locator, Page, Request } from "@playwright/test"

import validations from "../../messages/en-US/course.validations.json" with { type: "json" }
import errors from "../../messages/en-US/errors.json" with { type: "json" }
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { courseZodSchemas } from "../../src/modules/course/course.zod"
import {
  LESSON_ATTACHMENT_EXTENSIONS,
  LESSON_ATTACHMENT_MAX_BYTES,
  LESSON_ATTACHMENT_MAX_MEGABYTES,
  LESSON_ATTACHMENT_UPLOADS_PER_MINUTE,
} from "../../src/modules/lesson-attachment/lesson-attachment.constants"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_COURSE, TEST_MATERIALS } from "../data/courses"
import { TEST_VIDEO } from "../data/videos"
import { expect, test } from "../fixtures/auth"
import { addChapter, addLesson, choose, createCourse, deleteCourse, newSlug, signInAsAdmin } from "../fixtures/course-admin"
import { chooseRowAction } from "../fixtures/data-grid"
import type { BasePage } from "../pages"
import { ownAddress } from "../fixtures/address"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [, customer] = TEST_ACCOUNTS
const [workbook] = TEST_MATERIALS
const CHAPTER = "Getting started"
const LESSON = { slug: "first-look", title: "A first look" } as const
const SERVER_FUNCTION_PATH = "/_serverFn/"
const NO_CHANGES = "Nothing to import: the courses here already match the file."
const UNSUPPORTED_EXTENSION = "exe"

const coursePath = (slug: string): string => `${ROUTES.COURSES}/${slug}`

const lessonPath = (course: string, lesson: string): string => `${coursePath(course)}/${lesson}`

const visit = async (page: Page, path: string): Promise<number | undefined> => {
  const response = await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  return response?.status()
}

const openEditor = async (page: Page, appPage: BasePage, courseId: string): Promise<void> => {
  await page.goto(`${ROUTES.ADMIN.COURSES.INDEX}/${courseId}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const editLesson = async (page: Page, appPage: BasePage, title: string): Promise<void> => {
  await chooseRowAction(page.getByRole("row", { name: title }), `Actions for ${title}`, "Edit")
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
  await appPage.waitForAppReady()
}

const buildCourse = async (page: Page, appPage: BasePage, title: string) => {
  const course = { slug: newSlug(), title }
  const courseId = await createCourse(page, appPage, course)
  await addChapter(page, CHAPTER)
  await expect(await addLesson(page, CHAPTER, LESSON)).toBeHidden()

  return { ...course, courseId }
}

const visitorPage = async (browser: Browser): Promise<Page> => browser.newPage()

const customerPage = async (browser: Browser, origin: string): Promise<Page> => {
  const context = await browser.newContext()
  const signedIn = await context.request.post(`${ROUTES.API.AUTH.BASE}${ROUTES.API.AUTH.SIGN_IN_EMAIL}`, {
    data: { email: customer.email, password: TEST_PASSWORD },
    headers: { "CF-Connecting-IP": ownAddress(), Origin: origin },
  })
  expect(signedIn.ok()).toBe(true)
  return context.newPage()
}

const isServerFunction = (request: Request): boolean => request.method() === "POST" && new URL(request.url()).pathname.startsWith(SERVER_FUNCTION_PATH)

const materialRow = (page: Page, title: string): Locator => page.getByRole("grid", { name: "Materials" }).getByRole("row", { name: title })

const uploadMaterial = async (page: Page, title: string, file: string): Promise<void> => {
  const dialog = await uploadDialog(page)
  await dialog.getByLabel("Title", { exact: true }).fill(title)
  await dialog.locator("input[type=file]").setInputFiles(file)
  await dialog.getByRole("button", { name: "Save material" }).click()
  await expect(dialog).toBeHidden()
}

const uploadDialog = async (page: Page): Promise<Locator> => {
  await page.getByRole("button", { name: "Upload a file" }).click()
  return page.getByRole("dialog", { name: "Upload a file" })
}

test.describe("course editing", () => {
  test("an administrator writes a lesson's description and key moments, and the lesson page shows them", async ({
    appPage,
    authPage,
    browser,
    page,
  }) => {
    await signInAsAdmin(page, authPage)
    const course = await buildCourse(page, appPage, "Lesson text")
    await editLesson(page, appPage, LESSON.title)

    await page.getByLabel("Description", { exact: true }).fill("Open `src/modules` first.\n\nThen follow one table.")
    await page.getByRole("button", { name: "Add a key moment" }).click()
    await page.getByLabel("Time of moment 1", { exact: true }).fill("0:01")
    await page.getByLabel("Label of moment 1", { exact: true }).fill("The modules folder")
    await page.getByRole("button", { name: "Add a key moment" }).click()
    await page.getByLabel("Time of moment 2", { exact: true }).fill("1:02:15")
    await page.getByLabel("Label of moment 2", { exact: true }).fill("The last table")
    await page.getByRole("button", { name: "Save lesson" }).click()
    await expect(page.getByText("Lesson saved")).toBeVisible()
    await page.getByRole("button", { name: "Use an existing video" }).click()
    await page.getByRole("dialog", { name: "Use an existing video" }).getByRole("button", { name: `Use ${TEST_VIDEO.title}` }).click()
    await expect(page.getByText("Video added to the lesson")).toBeVisible()

    const visitor = await visitorPage(browser)
    await visit(visitor, lessonPath(course.slug, LESSON.slug))
    const description = visitor.locator("#lesson-description")
    await expect(description.locator("code")).toHaveText("src/modules")
    await expect(description.getByText(/^Open\s+src\/modules\s+first\.$/u)).toBeVisible()
    await expect(description.getByText("Then follow one table.")).toBeVisible()
    const moments = visitor.getByRole("region", { name: "Key moments" })
    await expect(moments.getByRole("button")).toHaveText([/0:01\s*The modules folder/u, /1:02:15\s*The last table/u])
    await visitor.close()

    await deleteCourse(page, appPage, course)
  })

  test("an administrator edits a course's title, summary, level, outcomes and status, the course page follows, and unpublishing hides it", async ({
    appPage,
    authPage,
    browser,
    page,
  }) => {
    await signInAsAdmin(page, authPage)
    const course = await buildCourse(page, appPage, "Course before its edit")
    const edited = { ...course, title: "Course after its edit" }

    await page.getByLabel("Title", { exact: true }).fill(edited.title)
    await page.getByLabel("Summary", { exact: true }).fill("A summary written after the course was created.")
    await choose(page.locator("form"), "Level", "Advanced")
    await page.getByRole("button", { name: "Add an outcome" }).click()
    await page.getByLabel("Outcome 1", { exact: true }).fill("Ship a course edit without a deploy")
    await page.getByRole("button", { name: "Save details" }).click()
    await expect(page.getByText("Details saved")).toBeVisible()

    const visitor = await visitorPage(browser)
    expect(await visit(visitor, coursePath(course.slug))).toBe(HTTP_STATUS.OK)
    const header = visitor.locator("header").filter({ has: visitor.getByRole("heading", { level: 1 }) })
    await expect(visitor.getByRole("heading", { level: 1, name: edited.title })).toBeVisible()
    await expect(header.getByText("A summary written after the course was created.")).toBeVisible()
    await expect(header.getByText("Advanced", { exact: true })).toBeVisible()
    await expect(visitor.getByText("Ship a course edit without a deploy")).toBeVisible()

    await choose(page.locator("form"), "Status", "Draft")
    await page.getByRole("button", { name: "Save details" }).click()
    await expect(page.getByText("Details saved")).toBeVisible()
    expect(await visit(visitor, coursePath(course.slug))).toBe(HTTP_STATUS.NOT_FOUND)
    await visit(visitor, ROUTES.COURSES)
    await expect(visitor.getByRole("link", { name: new RegExp(edited.title, "u") })).toHaveCount(0)
    await visitor.close()

    await deleteCourse(page, appPage, edited)
  })

  test("a draft course and a draft lesson answer 404 to visitors and customers", async ({ appPage, authPage, baseURL, browser, page }) => {
    test.slow()
    await signInAsAdmin(page, authPage)
    const draft = { slug: newSlug(), status: "Draft", title: "Draft course" }
    await createCourse(page, appPage, draft)
    const course = await buildCourse(page, appPage, "Course with a draft lesson")
    const hidden = { slug: "hidden-lesson", status: "Draft", title: "Hidden lesson" }
    await expect(await addLesson(page, CHAPTER, hidden)).toBeHidden()

    for (const viewer of [await visitorPage(browser), await customerPage(browser, new URL(baseURL ?? "").origin)]) {
      expect(await visit(viewer, coursePath(draft.slug))).toBe(HTTP_STATUS.NOT_FOUND)
      expect(await visit(viewer, lessonPath(course.slug, hidden.slug))).toBe(HTTP_STATUS.NOT_FOUND)
      expect(await visit(viewer, lessonPath(course.slug, LESSON.slug))).toBe(HTTP_STATUS.OK)
      await expect(viewer.getByRole("link", { name: new RegExp(hidden.title, "u") })).toHaveCount(0)
      await viewer.context().close()
    }

    await deleteCourse(page, appPage, draft)
    await deleteCourse(page, appPage, course)
  })

  test("an administrator renames a chapter, deletes a lesson and then the chapter, and the course page follows each change", async ({
    appPage,
    authPage,
    browser,
    page,
  }) => {
    test.slow()
    await signInAsAdmin(page, authPage)
    const course = await buildCourse(page, appPage, "Chapters that change")
    const second = { slug: "second-look", title: "A second look" }
    const later = { slug: "later-look", title: "A later look" }
    await expect(await addLesson(page, CHAPTER, second)).toBeHidden()
    await addChapter(page, "Going further")
    await expect(await addLesson(page, "Going further", later)).toBeHidden()

    await chooseRowAction(page.getByRole("row", { name: new RegExp(CHAPTER, "u") }).first(), `Actions for ${CHAPTER}`, "Edit")
    const dialog = page.getByRole("dialog", { name: "Edit chapter" })
    await dialog.getByLabel("Chapter title").fill("Where it begins")
    await dialog.getByRole("button", { name: "Save chapter" }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("heading", { level: 3, name: "Where it begins" })).toBeVisible()

    const visitor = await visitorPage(browser)
    await visit(visitor, coursePath(course.slug))
    await expect(visitor.getByRole("button", { name: /Where it begins/u })).toBeVisible()
    await expect(visitor.getByRole("button", { name: new RegExp(CHAPTER, "u") })).toHaveCount(0)

    await chooseRowAction(page.getByRole("row", { name: second.title }), `Actions for ${second.title}`, "Delete")
    await page.getByRole("alertdialog", { name: "Delete this lesson?" }).getByRole("button", { name: "Delete" }).click()
    await expect(page.getByRole("row", { name: second.title })).toHaveCount(0)
    expect(await visit(visitor, lessonPath(course.slug, second.slug))).toBe(HTTP_STATUS.NOT_FOUND)
    await visit(visitor, coursePath(course.slug))
    await expect(visitor.getByRole("link", { name: new RegExp(second.title, "u") })).toHaveCount(0)
    expect(await visit(visitor, lessonPath(course.slug, LESSON.slug))).toBe(HTTP_STATUS.OK)

    await chooseRowAction(page.getByRole("row", { name: /Where it begins/u }).first(), "Actions for Where it begins", "Delete")
    await page.getByRole("alertdialog", { name: "Delete this chapter?" }).getByRole("button", { name: "Delete" }).click()
    await expect(page.getByRole("heading", { level: 3, name: "Where it begins" })).toHaveCount(0)
    await expect(page.getByRole("row", { name: LESSON.title })).toHaveCount(0)
    expect(await visit(visitor, lessonPath(course.slug, LESSON.slug))).toBe(HTTP_STATUS.NOT_FOUND)
    await visit(visitor, coursePath(course.slug))
    await expect(visitor.getByRole("button", { name: /Where it begins/u })).toHaveCount(0)
    await expect(visitor.getByRole("link", { name: new RegExp(LESSON.title, "u") })).toHaveCount(0)
    await expect(visitor.getByRole("link", { name: new RegExp(later.title, "u") })).toBeVisible()
    await visitor.close()

    await deleteCourse(page, appPage, course)
  })

  test("an administrator renames a material and deletes another, and the lesson page and the download path follow", async ({
    appPage,
    authPage,
    browser,
    page,
  }) => {
    await signInAsAdmin(page, authPage)
    const course = await buildCourse(page, appPage, "Materials that change")
    await editLesson(page, appPage, LESSON.title)
    for (const title of ["Workbook", "Cheat sheet"]) {
      await uploadMaterial(page, title, workbook.file)
      await expect(materialRow(page, title)).toBeVisible()
    }

    const visitor = await visitorPage(browser)
    await visit(visitor, lessonPath(course.slug, LESSON.slug))
    const materials = visitor.getByRole("region", { name: "Materials" })
    const download = (await materials.getByRole("link", { name: "Cheat sheet" }).getAttribute("href")) ?? ""
    expect((await visitor.request.get(download)).status()).toBe(HTTP_STATUS.OK)

    await chooseRowAction(materialRow(page, "Workbook"), "Actions for Workbook", "Edit")
    const rename = page.getByRole("dialog", { name: "Rename file" })
    await rename.getByLabel("Title", { exact: true }).fill("Module workbook")
    await rename.getByRole("button", { name: "Save material" }).click()
    await expect(rename).toBeHidden()

    await chooseRowAction(materialRow(page, "Cheat sheet"), "Actions for Cheat sheet", "Delete")
    await page.getByRole("alertdialog", { name: "Delete this material?" }).getByRole("button", { name: "Delete" }).click()
    await expect(materialRow(page, "Cheat sheet")).toHaveCount(0)

    await visitor.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(materials.getByRole("link")).toHaveText(["Module workbook"])
    expect((await visitor.request.get(download)).status()).toBe(HTTP_STATUS.NOT_FOUND)
    await visitor.close()

    await deleteCourse(page, appPage, course)
  })

  test("a material over the size limit, of a type outside the list or past the per-minute limit is refused", async ({
    appPage,
    authPage,
    page,
  }) => {
    test.slow()
    await signInAsAdmin(page, authPage)
    const course = await buildCourse(page, appPage, "Materials with limits")
    await editLesson(page, appPage, LESSON.title)
    const oversized = test.info().outputPath("oversized.pdf")
    const unsupported = test.info().outputPath(`installer.${UNSUPPORTED_EXTENSION}`)
    await writeFile(oversized, Buffer.alloc(LESSON_ATTACHMENT_MAX_BYTES + 1))
    await writeFile(unsupported, "not a lesson material")
    expect(LESSON_ATTACHMENT_EXTENSIONS).not.toContain(UNSUPPORTED_EXTENSION)

    const uploads: Request[] = []
    page.on("request", (request) => {
      if (isServerFunction(request) && (request.headers()["content-type"] ?? "").startsWith("multipart/form-data")) {
        uploads.push(request)
      }
    })
    const dialog = await uploadDialog(page)
    await dialog.getByLabel("Title", { exact: true }).fill("Too much")
    for (const [file, message] of [
      [oversized, validations.fileTooLarge.replace("{max}", String(LESSON_ATTACHMENT_MAX_MEGABYTES))],
      [unsupported, validations.fileTypeUnsupported],
    ] as const) {
      await dialog.locator("input[type=file]").setInputFiles(file)
      await dialog.getByRole("button", { name: "Save material" }).click()
      await expect(dialog.getByText(message)).toBeVisible()
    }

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    expect(uploads).toStrictEqual([])

    const materials = page.getByRole("grid", { name: "Materials" }).getByRole("row")
    for (let uploaded = 1; uploaded <= LESSON_ATTACHMENT_UPLOADS_PER_MINUTE; uploaded += 1) {
      await uploadMaterial(page, `Workbook ${String(uploaded)}`, workbook.file)
      await expect(materials).toHaveCount(uploaded)
    }
    const refused = await uploadDialog(page)
    await refused.getByLabel("Title", { exact: true }).fill("One too many")
    await refused.locator("input[type=file]").setInputFiles(workbook.file)
    await refused.getByRole("button", { name: "Save material" }).click()
    await expect(page.getByText(errors.codes.TOO_MANY_REQUESTS)).toBeVisible()
    await expect(refused).toBeVisible()
    await page.keyboard.press("Escape")
    await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(materials).toHaveCount(LESSON_ATTACHMENT_UPLOADS_PER_MINUTE)

    await deleteCourse(page, appPage, course)
  })

  test("a course or lesson slug already in use is refused with a field error", async ({ appPage, authPage, page }) => {
    await signInAsAdmin(page, authPage)
    const course = await buildCourse(page, appPage, "Slugs in use")

    await page.goto(ROUTES.ADMIN.COURSES.CREATE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await page.getByLabel("Title", { exact: true }).fill("A course that wants a taken slug")
    await page.getByLabel("Summary", { exact: true }).fill("Its slug belongs to another course.")
    await page.getByLabel("URL slug").fill(TEST_COURSE.slug)
    await page.getByRole("button", { name: "Create course" }).click()
    await expect(page.getByLabel("URL slug")).toHaveAttribute("aria-invalid", "true")
    await expect(page.getByLabel("URL slug")).toBeFocused()
    await expect(page.getByText(validations.courseSlugTaken)).toBeVisible()
    await expect(page).toHaveURL(ROUTES.ADMIN.COURSES.CREATE)

    await openEditor(page, appPage, course.courseId)
    await page.getByLabel("URL slug").fill(TEST_COURSE.slug)
    await page.getByRole("button", { name: "Save details" }).click()
    await expect(page.getByText(validations.courseSlugTaken)).toBeVisible()
    await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(page.getByLabel("URL slug")).toHaveValue(course.slug)

    const dialog = await addLesson(page, CHAPTER, { slug: LESSON.slug, title: "A lesson that wants a taken slug" })
    await expect(dialog.getByText(validations.lessonSlugTaken)).toBeVisible()
    await expect(dialog.getByLabel("URL slug")).toHaveAttribute("aria-invalid", "true")
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("row", { name: "A lesson that wants a taken slug" })).toHaveCount(0)

    const second = { slug: "second-look", title: "A second look" }
    await expect(await addLesson(page, CHAPTER, second)).toBeHidden()
    await editLesson(page, appPage, second.title)
    await page.getByLabel("URL slug").fill(LESSON.slug)
    await page.getByRole("button", { name: "Save lesson" }).click()
    await expect(page.getByText(validations.lessonSlugTaken)).toBeVisible()
    await expect(page.getByLabel("URL slug")).toHaveAttribute("aria-invalid", "true")

    await deleteCourse(page, appPage, course)
  })

  test("an administrator exports every course or one, and the file of a deleted course imports it back without changes", async ({
    appPage,
    authPage,
    browser,
    page,
  }) => {
    test.slow()
    await signInAsAdmin(page, authPage)
    const course = await buildCourse(page, appPage, "A course that travels")

    await page.goto(ROUTES.ADMIN.COURSES.INDEX, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const everything = page.waitForEvent("download")
    await page.getByRole("button", { name: "Export all" }).click()
    const all = courseZodSchemas.courseDocument.parse(JSON.parse(await readFile(await (await everything).path(), "utf8")))
    expect(all.courses.map(({ slug }) => slug)).toEqual(expect.arrayContaining([TEST_COURSE.slug, course.slug]))

    await openEditor(page, appPage, course.courseId)
    const single = page.waitForEvent("download")
    await page.getByRole("button", { exact: true, name: "Export" }).click()
    const download = await single
    expect(download.suggestedFilename()).toMatch(new RegExp(`^${course.slug}-\\d{4}-\\d{2}-\\d{2}\\.json$`, "u"))
    const file = test.info().outputPath(download.suggestedFilename())
    await download.saveAs(file)
    const one = courseZodSchemas.courseDocument.parse(JSON.parse(await readFile(file, "utf8")))
    expect(one.courses.map(({ slug }) => slug)).toStrictEqual([course.slug])

    await deleteCourse(page, appPage, course)
    const visitor = await visitorPage(browser)
    expect(await visit(visitor, coursePath(course.slug))).toBe(HTTP_STATUS.NOT_FOUND)

    for (const expected of ["Courses imported", NO_CHANGES]) {
      await page.getByRole("button", { exact: true, name: "Import" }).click()
      const dialog = page.getByRole("dialog", { name: "Import courses" })
      await dialog.locator("input[type=file]").setInputFiles(file)
      await dialog.getByRole("button", { name: "Check file" }).click()
      if (expected === NO_CHANGES) {
        await expect(dialog.getByText(NO_CHANGES)).toBeVisible()
        await expect(dialog.getByRole("button", { exact: true, name: "Import" })).toBeDisabled()
      } else {
        await dialog.getByRole("button", { exact: true, name: "Import" }).click()
        await expect(page.getByText(expected)).toBeVisible()
        await expect(dialog).toBeHidden()
      }
    }

    expect(await visit(visitor, lessonPath(course.slug, LESSON.slug))).toBe(HTTP_STATUS.OK)
    await expect(visitor.getByRole("heading", { level: 1, name: LESSON.title })).toBeVisible()
    await visitor.close()

    await deleteCourse(page, appPage, course)
  })
})
