import type { Locator, Page } from "@playwright/test"

import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { TEST_COURSE_LEARNER } from "../data/licenses"
import { expect, test } from "../fixtures/auth"
import { BADGE_INK_TOLERANCE_PX, META_ROW_TOLERANCE_PX, TITLE_GAP_TOLERANCE_PX, badgeLayout } from "../fixtures/badge-layout"
import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [admin, customer] = TEST_ACCOUNTS
const [preview, account, paid, recording] = TEST_LESSONS

const LESSON_VIEW = {
  OFFER: "offer",
  PLAYS: "plays",
  RECORDING: "recording",
  SIGN_UP: "signUp",
} as const

type LessonView = (typeof LESSON_VIEW)[keyof typeof LESSON_VIEW]

const ALIGNMENT_VIEWPORTS = [
  { height: 900, width: 1280 },
  { height: 1024, width: 768 },
  { height: 844, width: 390 },
] as const

const ZOOMED_VIEW = { deviceScaleFactor: 2, viewport: { height: 450, width: 640 } } as const

const CENTRE_TOLERANCE_PX = 1

const BASELINE_TOLERANCE_PX = 0.5

const COLUMN_TOLERANCE_PX = 0.5

const META_GAP_PX = 8

const curriculumAlignment = async (list: Locator) =>
  list.evaluate((section) => {
    const firstLineCentre = (element: Element): number => {
      const range = document.createRange()
      range.selectNodeContents(element)
      const [line] = range.getClientRects()
      return (line?.top ?? Number.NaN) + (line?.height ?? Number.NaN) / 2
    }
    const baseline = (element: Element): number => {
      const probe = document.createElement("span")
      probe.style.display = "inline-block"
      probe.style.marginRight = "-100vw"
      element.prepend(probe)
      const { bottom } = probe.getBoundingClientRect()
      probe.remove()
      return bottom
    }
    const centre = (element: Element): number => element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2
    const marks = (title: Element, selector: string): Element[] => [...(title.parentElement?.querySelectorAll(selector) ?? [])]
    const drift = (title: Element): number =>
      Math.max(
        ...marks(title, "[data-slot=lesson-icon] svg, [data-slot=lesson-lock] svg, [data-slot=chapter-toggle]").map((mark) =>
          Math.abs(centre(mark) - firstLineCentre(title)),
        ),
        ...marks(title, "[data-slot=lesson-number], [data-slot=chapter-number]").map((number) =>
          Math.abs(firstLineCentre(number) - firstLineCentre(title)),
        ),
      )
    const baselineDrift = (title: Element): number =>
      Math.max(
        0,
        ...marks(title, "[data-slot=lesson-number], [data-slot=chapter-number]").map((number) => Math.abs(baseline(number) - baseline(title))),
      )
    const visible = (selector: string): Element[] => [...section.querySelectorAll(selector)].filter((element) => element.getClientRects().length > 0)
    const lessons = visible("[data-slot=lesson-title]")
    const chapters = visible("[data-slot=chapter-title]")
    const titles = [...chapters, ...lessons]

    return {
      baselineDrift: Math.max(...titles.map((title) => baselineDrift(title))),
      centreDrift: Math.max(...titles.map((title) => drift(title))),
      chapterLefts: chapters.map((title) => title.getBoundingClientRect().left),
      lessonLefts: lessons.map((title) => title.getBoundingClientRect().left),
      marks: titles.flatMap((title) => marks(title, "[data-slot=lesson-icon] svg, [data-slot=chapter-toggle]")).length,
      wrapped: lessons.filter((title) => title.getBoundingClientRect().height > Number.parseFloat(getComputedStyle(title).lineHeight) * 1.5).length,
    }
  })

const fontsLoaded = async (view: Page): Promise<void> => {
  await view.evaluate(async () => {
    await document.fonts.ready
  })
}

const expectOneCentreLine = (alignment: Awaited<ReturnType<typeof curriculumAlignment>>): void => {
  expect(alignment.marks).toBeGreaterThan(0)
  expect(alignment.centreDrift).toBeLessThanOrEqual(CENTRE_TOLERANCE_PX)
  expect(alignment.baselineDrift).toBeLessThanOrEqual(BASELINE_TOLERANCE_PX)
  const [chapterLeft] = alignment.chapterLefts
  for (const left of [...alignment.chapterLefts, ...alignment.lessonLefts]) {
    expect(Math.abs(left - (chapterLeft ?? 0))).toBeLessThanOrEqual(COLUMN_TOLERANCE_PX)
  }
}

const lessonPath = (slug: string, prefix = ""): string => `${prefix}/courses/${TEST_COURSE.slug}/${slug}`

const signedPlaylist = (page: Page) => page.waitForResponse((response) => /\/media\/[\da-z]+\.[\da-f]{64}\/.+\/master\.m3u8$/u.test(response.url()))

const mediaTime = async (page: Page): Promise<number> => page.locator("video").evaluate((video: HTMLVideoElement) => video.currentTime)

const LESSON_CHECKS: Record<LessonView, (page: Page, path: string) => Promise<void>> = {
  [LESSON_VIEW.OFFER]: async (page, path) => {
    await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page.getByRole("link", { name: "Get Complete" })).toBeVisible()
    await expect(page.locator("video")).toHaveCount(0)
  },
  [LESSON_VIEW.PLAYS]: async (page, path) => {
    const playlist = signedPlaylist(page)
    await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    expect((await playlist).status()).toBe(HTTP_STATUS.OK)
    await expect(page.getByRole("link", { name: "Get Complete" })).toHaveCount(0)
  },
  [LESSON_VIEW.RECORDING]: async (page, path) => {
    await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page.getByText("The recording for this lesson is on its way.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Get Complete" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Mark as complete" })).toHaveCount(0)
  },
  [LESSON_VIEW.SIGN_UP]: async (page, path) => {
    await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(page.getByRole("link", { name: "Create a free account" })).toBeVisible()
    await expect(page.locator("video")).toHaveCount(0)
  },
}

const VIEWERS = [
  {
    email: undefined,
    name: "a visitor",
    views: [LESSON_VIEW.PLAYS, LESSON_VIEW.SIGN_UP, LESSON_VIEW.OFFER, LESSON_VIEW.RECORDING, LESSON_VIEW.RECORDING, LESSON_VIEW.RECORDING],
  },
  {
    email: customer.email,
    name: "a customer without Complete",
    views: [LESSON_VIEW.PLAYS, LESSON_VIEW.PLAYS, LESSON_VIEW.OFFER, LESSON_VIEW.RECORDING, LESSON_VIEW.RECORDING, LESSON_VIEW.RECORDING],
  },
  {
    email: TEST_COURSE_LEARNER.email,
    name: "a Complete learner",
    views: [LESSON_VIEW.PLAYS, LESSON_VIEW.PLAYS, LESSON_VIEW.PLAYS, LESSON_VIEW.RECORDING, LESSON_VIEW.RECORDING, LESSON_VIEW.RECORDING],
  },
] as const

const signIn = async (page: Page, authPage: AuthPage, email: string | undefined): Promise<void> => {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
  if (email === undefined) {
    return
  }
  await authPage.signIn(email)
  await expect(page).toHaveURL(/\/(?:app|admin)\/?$/u)
}

const courseBlockTitle = async (page: Page, prefix: string, title: string): Promise<void> => {
  const href = `${prefix}/courses/${TEST_COURSE.slug}`
  await page.goto(`${prefix}/`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  const showcase = page.locator("#toolkit article").nth(1)
  await showcase.scrollIntoViewIfNeeded()
  await expect(showcase.getByRole("link", { exact: true, name: title }).and(page.locator(`[href="${href}"]`))).toBeVisible()
}

test.describe("lesson pages for each viewer", () => {
  for (const viewer of VIEWERS) {
    test(`${viewer.name} sees what each kind of lesson offers`, async ({ authPage, page }) => {
      await signIn(page, authPage, viewer.email)

      for (const [index, lesson] of TEST_LESSONS.entries()) {
        const view = viewer.views[index]
        if (view === undefined) {
          throw new Error(`No expected view for ${lesson.slug}`)
        }
        await LESSON_CHECKS[view](page, lessonPath(lesson.slug))
        await expect(page.getByRole("heading", { level: 1, name: lesson.title["en-US"] })).toBeVisible()
      }
    })
  }
})

test.describe("course and lesson pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
  })

  test("the course page lists each chapter as an accordion with each lesson's access and recording", async ({ appPage, page }) => {
    await page.goto(`/courses/${TEST_COURSE.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    const header = page.locator("header").filter({ has: page.getByRole("heading", { level: 1 }) })
    await expect(header.getByText("Intermediate", { exact: true })).toBeVisible()
    await expect(header.getByText("3 of 6 lessons recorded")).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "What you’ll learn" })).toBeVisible()
    await expect(page.getByText(TEST_COURSE.prerequisites["en-US"][0])).toBeVisible()
    await expect(page.getByRole("link", { name: new RegExp(`^${preview.title["en-US"]}.*Free preview`, "u") })).toBeVisible()
    await expect(page.getByRole("link", { name: new RegExp(`${account.title["en-US"]}.*Locked: free with an account`, "u") })).toBeVisible()
    await expect(page.getByRole("link", { name: new RegExp(`${paid.title["en-US"]}.*Locked: included with Complete`, "u") })).toBeVisible()
    await expect(page.getByRole("link", { name: new RegExp(paid.title["en-US"], "u") }).getByText("Included with Complete", { exact: true })).toBeVisible()

    const [, quality] = TEST_COURSE.chapters
    const chapter = page.getByRole("button", { name: new RegExp(quality.title["en-US"], "u") })
    await expect(chapter).toHaveAttribute("aria-expanded", "false")
    await expect(page.getByRole("link", { name: new RegExp(recording.title["en-US"], "u") })).toBeHidden()
    await chapter.press("Enter")
    await expect(chapter).toHaveAttribute("aria-expanded", "true")
    await expect(page.getByRole("link", { name: new RegExp(`${recording.title["en-US"]}.*Coming soon`, "u") })).toBeVisible()
  })

  test("the curriculum sets each lesson's icon, number and lock and each chapter's number on the centre and baseline of its title's first line", async ({
    baseURL,
    browser,
    page,
  }) => {
    const curriculum = (view: Page): Locator => view.locator("section[aria-labelledby=course-curriculum]")

    for (const viewport of ALIGNMENT_VIEWPORTS) {
      await page.setViewportSize(viewport)
      await page.goto(`/courses/${TEST_COURSE.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await fontsLoaded(page)
      await curriculum(page).scrollIntoViewIfNeeded()

      const alignment = await curriculumAlignment(curriculum(page))

      expect(alignment.lessonLefts.length).toBeGreaterThan(0)
      expectOneCentreLine(alignment)
      if (viewport.width < ALIGNMENT_VIEWPORTS[0].width / 2) {
        expect(alignment.wrapped).toBeGreaterThan(0)
      }
    }

    await page.setViewportSize(ALIGNMENT_VIEWPORTS[0])
    await page.goto(lessonPath(paid.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await fontsLoaded(page)
    expectOneCentreLine(await curriculumAlignment(page.locator("#lesson-sidebar")))

    const zoomed = await browser.newContext({ ...ZOOMED_VIEW, ...(baseURL === undefined ? {} : { baseURL }) })
    const zoomedPage = await zoomed.newPage()
    await zoomedPage.goto(`/courses/${TEST_COURSE.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await fontsLoaded(zoomedPage)
    await curriculum(zoomedPage).scrollIntoViewIfNeeded()
    expectOneCentreLine(await curriculumAlignment(curriculum(zoomedPage)))
    await zoomed.close()
  })

  test("each badge centres its label, and each lesson's badge and length share one centre line the same gap below its title", async ({
    baseURL,
    browser,
    page,
  }) => {
    const expectBadges = async (scope: Locator, label: string): Promise<void> => {
      const layout = await badgeLayout(scope)
      expect(layout.badges, label).toBeGreaterThan(0)
      expect(layout.inkOffset, label).toBeLessThanOrEqual(BADGE_INK_TOLERANCE_PX)
      expect(layout.metaDrift, label).toBeLessThanOrEqual(META_ROW_TOLERANCE_PX)
      for (const gap of layout.titleGaps) {
        expect(Math.abs(gap - META_GAP_PX), label).toBeLessThanOrEqual(TITLE_GAP_TOLERANCE_PX)
      }
    }

    for (const viewport of ALIGNMENT_VIEWPORTS) {
      await page.setViewportSize(viewport)
      await page.goto(`/courses/${TEST_COURSE.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await fontsLoaded(page)
      const curriculum = page.locator("section[aria-labelledby=course-curriculum]")
      await curriculum.scrollIntoViewIfNeeded()
      expect((await badgeLayout(curriculum)).titleGaps.length).toBeGreaterThan(0)
      await expectBadges(page.locator("main"), `course page at ${String(viewport.width)}px`)

      await page.goto(lessonPath(recording.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await fontsLoaded(page)
      await expectBadges(page.locator("article"), `lesson page at ${String(viewport.width)}px`)
    }

    const zoomed = await browser.newContext({ ...ZOOMED_VIEW, ...(baseURL === undefined ? {} : { baseURL }) })
    const zoomedPage = await zoomed.newPage()
    await zoomedPage.goto(`/courses/${TEST_COURSE.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await fontsLoaded(zoomedPage)
    await expectBadges(zoomedPage.locator("main"), "course page at 200%")
    await zoomed.close()
  })

  test("the unlock panel sticks below the header with the same gap at every scroll", async ({ page }) => {
    await page.setViewportSize({ height: 720, width: 1280 })
    await page.goto(`/courses/${TEST_COURSE.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    const panel = page.getByRole("region", { name: TEST_COURSE.title["en-US"] })
    const header = page.getByRole("banner")
    const gap = await panel.evaluate((element) => Number.parseFloat(getComputedStyle(element).top))
    const headerBox = await header.boundingBox()
    if (headerBox === null) {
      throw new Error("The header has no box")
    }
    expect(gap).toBeGreaterThan(headerBox.height)

    await page.mouse.wheel(0, 300)
    await expect.poll(async () => (await panel.boundingBox())?.y).toBeCloseTo(gap, 0)
    const bottom = headerBox.y + headerBox.height
    expect((await panel.boundingBox())?.y ?? 0).toBeGreaterThan(bottom)
  })

  test("key moments and transcript lines seek the player", async ({ page }) => {
    const playlist = signedPlaylist(page)
    await page.goto(lessonPath(preview.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    expect((await playlist).status()).toBe(HTTP_STATUS.OK)
    await expect(page.getByText(preview.description["en-US"].split("\n")[0] ?? "")).toBeVisible()

    const [moment] = preview.keyMoments
    await page.getByRole("region", { name: "Key moments" }).getByRole("button", { name: `0:01 ${moment.label["en-US"]}` }).click()
    await expect.poll(async () => mediaTime(page)).toBeGreaterThanOrEqual(moment.seconds)

    const transcript = page.getByRole("region", { name: "Transcript" })
    await expect(transcript.getByRole("button", { name: "0:00 Every feature starts at a module." })).toBeVisible()
    await transcript.getByRole("button", { name: "0:00 Every feature starts at a module." }).click()
    await expect.poll(async () => mediaTime(page)).toBeLessThan(moment.seconds)
  })

  test("on a phone the course contents open in a sheet", async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto(lessonPath(preview.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await expect(page.locator("#lesson-sidebar")).toBeHidden()
    const sheet = page.getByRole("dialog", { name: "Course contents" })
    await expect(async () => {
      await page.getByRole("button", { name: "Course contents" }).click()
      await expect(sheet).toBeVisible({ timeout: 1000 })
    }).toPass()
    await sheet.getByRole("link", { name: new RegExp(paid.title["en-US"], "u") }).click()

    await expect(page).toHaveURL(lessonPath(paid.slug))
    await expect(sheet).toBeHidden()
  })

  test("on a wide screen the course contents sit beside the lesson and can be hidden", async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 1280 })
    await page.goto(lessonPath(recording.slug), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    const sidebar = page.getByRole("navigation", { name: "Course contents" })
    await expect(sidebar.getByRole("link", { name: new RegExp(recording.title["en-US"], "u") })).toHaveAttribute("aria-current", "page")
    await expect(page.getByText("The recording for this lesson is on its way.")).toBeVisible()
    await expect(async () => {
      await page.getByRole("button", { name: "Hide contents" }).click()
      await expect(sidebar).toBeHidden({ timeout: 1000 })
    }).toPass()
    await page.getByRole("button", { name: "Show contents" }).click()
    await expect(sidebar).toBeVisible()
  })

  test("the course and its lessons read in Polish", async ({ page }) => {
    await page.goto(`/pl-PL/courses/${TEST_COURSE.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await expect(page.getByRole("heading", { level: 1, name: TEST_COURSE.title["pl-PL"] })).toBeVisible()
    await expect(page.getByText("Średnio zaawansowany", { exact: true }).first()).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Program" })).toBeVisible()
    await page.getByRole("link", { name: new RegExp(`${preview.title["pl-PL"]}.*Darmowy podgląd`, "u") }).click()
    await expect(page).toHaveURL(lessonPath(preview.slug, "/pl-PL"))
    await expect(page.getByRole("heading", { level: 2, name: "Kluczowe momenty" })).toBeVisible()

    await courseBlockTitle(page, "/pl-PL", TEST_COURSE.title["pl-PL"])
    await expect(page.getByRole("link", { name: `${preview.title["pl-PL"]} Darmowy podgląd` })).toBeVisible()
  })
})

const FIRST_COURSE_ROW = 1

test("a course created and renamed in the admin reaches the landing page and the catalogue without a deploy", async ({
  appPage,
  authPage,
  browser,
  page,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8)
  const slug = `e2e-fresh-${suffix}`
  const title = `Fresh course ${suffix}`
  const renamed = `Renamed course ${suffix}`
  const href = `/courses/${slug}`
  await signIn(page, authPage, admin.email)
  const visitor = await browser.newPage()
  const courseRow = (name: string) => page.getByRole("row").filter({ hasText: name })

  const landingShows = async (name: string): Promise<void> => {
    await visitor.goto("/", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    const showcase = visitor.locator("#toolkit article").nth(1)
    await showcase.scrollIntoViewIfNeeded()
    await expect(showcase.getByRole("link", { exact: true, name }).and(visitor.locator(`[href="${href}"]`))).toBeVisible()
  }

  await page.goto("/admin/courses/create", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByLabel("Title", { exact: true }).fill(title)
  await page.getByLabel("Summary", { exact: true }).fill("A course that exists only for this test.")
  await page.getByLabel("URL slug").fill(slug)
  await page.locator("form").getByRole("button", { name: /Status/u }).click()
  await page.getByRole("option", { exact: true, name: "Published" }).click()
  await page.getByRole("button", { name: "Create course" }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/[\da-f-]{36}$/u)
  const editor = page.url()

  try {
    await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const moveUp = courseRow(slug).getByRole("button", { name: `Move ${title} up` })
    await expect(async () => {
      if (await moveUp.isEnabled()) {
        await moveUp.click()
      }
      expect(await courseRow(slug).evaluate((row: HTMLTableRowElement) => row.rowIndex)).toBe(FIRST_COURSE_ROW)
    }).toPass()

    await landingShows(title)

    await page.goto(editor, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await page.getByLabel("Title", { exact: true }).fill(renamed)
    await page.getByRole("button", { name: "Save details" }).click()
    await expect(page.getByText("Details saved").last()).toBeVisible()

    await landingShows(renamed)
    await visitor.goto("/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await expect(visitor.getByRole("link", { name: new RegExp(renamed, "u") })).toHaveAttribute("href", href)
  } finally {
    await page.goto("/admin/courses", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await courseRow(slug).getByRole("button", { name: /^Delete / }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete course" }).click()
    await expect(courseRow(slug)).toHaveCount(0)
    await visitor.close()
  }
})
