import { writeFile } from "node:fs/promises"

import type { Locator, Page, Request as PlaywrightRequest } from "@playwright/test"
import * as zod from "zod"

import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { VIDEO_UPLOAD_PART_BYTES } from "../../src/modules/video-upload/video-upload.constants"
import { PART_FIELDS } from "../../src/modules/video-upload/video-upload.files"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { TEST_VIDEO } from "../data/videos"
import { expect, test } from "../fixtures/auth"
import { chooseRowAction } from "../fixtures/data-grid"
import type { AuthPage, BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin, customer] = TEST_ACCOUNTS

const SIGNED_PATH = /^\/media\/[\da-z]+\.[\da-f]{64}\//u
const FORGED_SIGNATURE = "0".repeat(64)
const ENCODER_WAIT_MS = 30_000
const RECORDING = { name: "first-look.mp4", text: "a small recording for the encoder double" } as const
const PARTS_IN_RECORDING = 3
const FIRST_PART = 1
const SERVER_FUNCTION_PATH = "/_serverFn/"
const PART_NUMBER_FIELD = new RegExp(`name="${PART_FIELDS.PART_NUMBER}"\\r\\n\\r\\n(?<part>\\d+)\\r\\n`, "u")
const MULTIPART_HEAD_BYTES = 1024

const isServerFunction = (url: URL): boolean => url.pathname.startsWith(SERVER_FUNCTION_PATH)

const partNumberOf = (request: PlaywrightRequest): number =>
  Number(PART_NUMBER_FIELD.exec(request.postDataBuffer()?.subarray(0, MULTIPART_HEAD_BYTES).toString("latin1") ?? "")?.groups?.["part"] ?? 0)

const signIn = async (page: Page, authPage: AuthPage, account: (typeof TEST_ACCOUNTS)[number]): Promise<void> => {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
  await authPage.gotoSignIn()
  await authPage.emailField().fill(account.email)
  await authPage.passwordField().fill(TEST_PASSWORD)
  await authPage.signInSubmitButton().click()
  await expect(page).toHaveURL(account.role === ROLE_CODES.ADMIN ? /\/admin\/?$/u : /\/app\/?$/u)
}

const choose = async (scope: Locator, label: string, option: string): Promise<void> => {
  await scope.getByRole("button", { name: new RegExp(label, "u") }).click()
  await scope.page().getByRole("option", { name: option, exact: true }).click()
  await expect(scope.page().getByRole("listbox")).toHaveCount(0)
}

const createCourse = async (
  page: Page,
  appPage: BasePage,
  { lessonType, slug }: { readonly lessonType: string; readonly slug: string },
): Promise<void> => {
  await page.goto("/admin/courses/create", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByLabel("Title", { exact: true }).fill("Recorded in the browser")
  await page.getByLabel("Summary", { exact: true }).fill("A course whose lesson gets its video in the lesson editor.")
  await page.getByLabel("URL slug").fill(slug)
  await choose(page.locator("form"), "Status", "Published")
  await page.getByRole("button", { name: "Create course" }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/[\da-f-]{36}$/u)

  await page.getByRole("button", { name: "Add chapter" }).click()
  const chapterDialog = page.getByRole("dialog", { name: "Add chapter" })
  await chapterDialog.getByLabel("Chapter title").fill("Getting started")
  await chapterDialog.getByRole("button", { name: "Save chapter" }).click()
  await expect(chapterDialog).toBeHidden()

  await page.getByRole("button", { name: "Add lesson" }).click()
  const lessonDialog = page.getByRole("dialog", { name: "Add lesson" })
  await lessonDialog.getByLabel("Lesson title").fill("A first look")
  await lessonDialog.getByLabel("Summary", { exact: true }).fill("What you are about to build.")
  await lessonDialog.getByLabel("URL slug").fill("first-look")
  await choose(lessonDialog, "Who can watch", "Everyone (free preview)")
  await choose(lessonDialog, "Status", "Published")
  await choose(lessonDialog, "Lesson type", lessonType)
  await lessonDialog.getByRole("button", { name: "Save lesson" }).click()
  await expect(lessonDialog).toBeHidden()
}

const deleteCourse = async (page: Page, appPage: BasePage, slug: string): Promise<void> => {
  await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await chooseRowAction(page.getByRole("row").filter({ hasText: slug }), "Actions for Recorded in the browser", "Delete")
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete course" }).click()
  await expect(page.getByRole("row").filter({ hasText: slug })).toHaveCount(0)
}

const DRAG_COPY = 1

const dropRecording = async (zone: Locator, browserName: string): Promise<void> => {
  const recording = test.info().outputPath(RECORDING.name)
  await writeFile(recording, RECORDING.text)
  if (browserName !== "chromium") {
    await zone.locator("input[type=file]").setInputFiles(recording)
    return
  }

  await zone.scrollIntoViewIfNeeded()
  const centre = await zone.evaluate((element) => {
    const { height, width, x, y } = element.getBoundingClientRect()
    return { x: x + width / 2, y: y + height / 2 }
  })
  const devtools = await zone.page().context().newCDPSession(zone.page())
  const data = { dragOperationsMask: DRAG_COPY, files: [recording], items: [] }
  await devtools.send("Input.dispatchDragEvent", { ...centre, data, type: "dragEnter" })
  await devtools.send("Input.dispatchDragEvent", { ...centre, data, type: "dragOver" })
  await expect(zone.getByText("Release to upload")).toBeVisible()
  await devtools.send("Input.dispatchDragEvent", { ...centre, data, type: "drop" })
  await devtools.detach()
}

test.describe("lesson videos", () => {
  test("an administrator drops a recording on a lesson, the encoder publishes it, the lesson plays it through a signed path and the video can be deleted", async ({
    appPage,
    authPage,
    browser,
    browserName,
    page,
  }) => {
    test.setTimeout(test.info().timeout + ENCODER_WAIT_MS)
    const slug = `e2e-${crypto.randomUUID().slice(0, 8)}`
    await signIn(page, authPage, admin)
    await createCourse(page, appPage, { lessonType: "Video lesson", slug })
    await expect(page.getByText("No video yet")).toBeVisible()

    await chooseRowAction(page.getByRole("row", { name: "A first look" }), "Actions for A first look", "Edit")
    await appPage.waitForAppReady()
    const card = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { level: 2, name: "Video" }) })
    await dropRecording(card.locator("[data-slot=video-drop-zone]"), browserName)
    await expect(card.getByText("Waiting for the encoder")).toBeVisible()
    await expect(card.getByText("bun run video:encode:test")).toBeVisible()
    await expect(card.getByRole("switch", { name: "This lesson has no video" })).toBeDisabled()

    const encoded = await page.request.get("/__test/videos/encode")
    expect(encoded.status()).toBe(HTTP_STATUS.OK)
    const { encoded: videoIds } = zod.object({ encoded: zod.array(zod.string()) }).parse(await encoded.json())
    expect(videoIds.length).toBeGreaterThan(0)

    const playlist = page.waitForResponse((response) => SIGNED_PATH.test(new URL(response.url()).pathname) && response.url().endsWith("/master.m3u8"))
    await expect(card.getByText("Plays for everyone who may open the lesson")).toBeVisible({ timeout: ENCODER_WAIT_MS })
    await expect(card.getByRole("paragraph").filter({ hasText: /^first-look$/u })).toBeVisible()
    const response = await playlist
    expect(response.status()).toBe(HTTP_STATUS.OK)
    expect(response.headers()["content-type"]).toBe("application/vnd.apple.mpegurl")
    expect(await response.text()).toContain("#EXT-X-MEDIA:TYPE=AUDIO")
    const segment = await page.request.get(response.url().replace("master.m3u8", "180p/seg-00000.m4s"))
    expect(segment.status()).toBe(HTTP_STATUS.OK)
    expect(segment.headers()["cache-control"]).toBe("private, max-age=86400, immutable")
    const forged = await page.request.get(response.url().replace(/\.[\da-f]{64}\//u, `.${FORGED_SIGNATURE}/`))
    expect(forged.status()).toBe(HTTP_STATUS.FORBIDDEN)

    const visitor = await browser.newPage()
    const visitorPlaylist = visitor.waitForResponse((entry) => entry.url().endsWith("/master.m3u8"))
    await visitor.goto(`/courses/${slug}/first-look`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    expect((await visitorPlaylist).status()).toBe(HTTP_STATUS.OK)

    await card.getByRole("button", { name: "Delete video" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete video" }).click()
    await expect(page.getByText("Video deleted")).toBeVisible()
    await expect(card.locator("[data-slot=video-drop-zone]")).toBeVisible()
    await visitor.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(visitor.getByText("The recording for this lesson is on its way.")).toBeVisible()
    await visitor.close()

    await deleteCourse(page, appPage, slug)
  })

  test("an administrator puts a video from the library on a lesson and visitors watch it", async ({ appPage, authPage, browser, page }) => {
    const slug = `e2e-${crypto.randomUUID().slice(0, 8)}`
    await signIn(page, authPage, admin)
    await createCourse(page, appPage, { lessonType: "Video lesson", slug })
    await chooseRowAction(page.getByRole("row", { name: "A first look" }), "Actions for A first look", "Edit")
    await appPage.waitForAppReady()

    await page.getByRole("button", { name: "Use an existing video" }).click()
    const picker = page.getByRole("dialog", { name: "Use an existing video" })
    await picker.getByRole("searchbox", { name: "Search videos" }).fill(TEST_VIDEO.title)
    await picker.getByRole("button", { name: `Use ${TEST_VIDEO.title}` }).click()
    await expect(page.getByText("Video added to the lesson")).toBeVisible()
    await expect(page.getByRole("button", { name: "Remove from this lesson" })).toBeVisible()

    const visitor = await browser.newPage()
    const playlist = visitor.waitForResponse((response) => response.url().endsWith(`/${TEST_VIDEO.id}/master.m3u8`))
    await visitor.goto(`/courses/${slug}/first-look`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    expect((await playlist).status()).toBe(HTTP_STATUS.OK)
    await visitor.close()

    await deleteCourse(page, appPage, slug)
  })

  test("an administrator makes a text lesson that visitors read without a player or a recording notice", async ({ appPage, authPage, browser, page }) => {
    const slug = `e2e-${crypto.randomUUID().slice(0, 8)}`
    await signIn(page, authPage, admin)
    await createCourse(page, appPage, { lessonType: "Text lesson, no video", slug })
    await expect(page.getByText("Text lesson", { exact: true })).toBeVisible()

    const visitor = await browser.newPage()
    await visitor.goto(`/courses/${slug}/first-look`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(visitor.getByRole("heading", { level: 1, name: "A first look" })).toBeVisible()
    await expect(visitor.getByRole("article").getByText("Text lesson", { exact: true })).toBeVisible()
    await expect(visitor.getByText("The recording for this lesson is on its way.")).toHaveCount(0)
    await expect(visitor.getByText("Coming soon")).toHaveCount(0)
    await expect(visitor.locator("video")).toHaveCount(0)
    await visitor.goto(`/courses/${slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(visitor.getByText("Recording now")).toHaveCount(0)
    await visitor.close()

    await deleteCourse(page, appPage, slug)
  })

  test("an upload cut off midway continues from the parts already stored when the same file is chosen again", async ({
    appPage,
    authPage,
    page,
  }) => {
    test.slow()
    const slug = `e2e-${crypto.randomUUID().slice(0, 8)}`
    const recording = test.info().outputPath("long-take.mp4")
    await writeFile(recording, Buffer.alloc(VIDEO_UPLOAD_PART_BYTES * PARTS_IN_RECORDING - 1))
    await signIn(page, authPage, admin)
    await createCourse(page, appPage, { lessonType: "Video lesson", slug })
    await chooseRowAction(page.getByRole("row", { name: "A first look" }), "Actions for A first look", "Edit")
    await appPage.waitForAppReady()

    const sent: number[] = []
    let cutOff = true
    await page.route(isServerFunction, async (route) => {
      const part = partNumberOf(route.request())
      if (part > 0) {
        sent.push(part)
      }
      if (cutOff && part > FIRST_PART) {
        await route.abort("connectionreset")
        return
      }
      await route.continue()
    })
    const card = page.locator("[data-slot=card]").filter({ has: page.getByRole("heading", { level: 2, name: "Video" }) })
    await card.locator("[data-slot=video-drop-zone] input[type=file]").setInputFiles(recording)
    await expect(card.getByRole("alert")).toContainText("The upload stopped")
    expect(sent).toContain(FIRST_PART)

    cutOff = false
    sent.length = 0
    await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await expect(card.getByText("The upload of long-take.mp4 stopped before it finished. Choose the same file to continue it.")).toBeVisible()
    const chooser = page.waitForEvent("filechooser")
    await card.getByRole("button", { name: "Choose the file again" }).click()
    await (await chooser).setFiles(recording)

    await expect(card.getByText("Waiting for the encoder")).toBeVisible({ timeout: ENCODER_WAIT_MS })
    expect(sent.toSorted()).toStrictEqual(Array.from({ length: PARTS_IN_RECORDING - FIRST_PART }, (_, index) => index + FIRST_PART + 1))

    await deleteCourse(page, appPage, slug)
  })

  test("a customer cannot open the course admin or stream a video without a signed path", async ({ authPage, page }) => {
    await signIn(page, authPage, customer)
    await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page).toHaveURL(/\/app\/?$/u)

    const unsigned = await page.request.get(`/media/zz.${FORGED_SIGNATURE}/${TEST_VIDEO.id}/master.m3u8`)
    expect(unsigned.status()).toBe(HTTP_STATUS.FORBIDDEN)
  })
})
