import type { Locator, Page, Route } from "@playwright/test"

import { ROUTES } from "../../src/routes"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { BADGE_INK_TOLERANCE_PX, META_ROW_TOLERANCE_PX, TITLE_GAP_TOLERANCE_PX, badgeLayout } from "../fixtures/badge-layout"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [freeLesson, accountLesson, paidLesson, recordingLesson] = TEST_LESSONS
const MOTION_FEATURES_CHUNK = /\/assets\/motion\.features-[\w-]+\.js$/u
const BROWSER_TIMEZONE = "Pacific/Kiritimati"
const BROWSER_TIME = new Date("2099-01-01T00:05:00+14:00")
const SERVER_FUNCTION = /\/_serverFn\//u
const LAYOUT_SHIFTS_KEY = "__layoutShifts"
const COURSES_FAILED_TIMEOUT_MS = 20_000
const NO_COURSES = /^No course is published yet/u
const SHOWCASE_FIELD = '"lessonCount"'
const META_GAP_PX = 8
const BADGE_VIEWPORTS = [
  { height: 900, width: 1280 },
  { height: 1024, width: 768 },
  { height: 844, width: 390 },
] as const

const COURSE_BLOCK_VIEWPORTS = [
  { maxEmptyLines: 1, name: "desktop", viewport: { height: 720, width: 1280 } },
  { maxEmptyLines: 3, name: "phone", viewport: { height: 844, width: 390 } },
] as const

const answerNoCourses = async (request: Route): Promise<void> => {
  const response = await request.fetch()
  const body = await response.text()
  if (body.includes(SHOWCASE_FIELD)) {
    await request.fulfill({ json: { result: [] } })
    return
  }

  await request.fulfill({ response })
}

const COURSE_BLOCK_OUTCOMES = [
  {
    filled: (showcase: Locator) => showcase.getByRole("link", { exact: true, name: TEST_COURSE.title["en-US"] }),
    name: "the courses arrive",
    settle: async (request: Route) => request.continue(),
  },
  {
    filled: (showcase: Locator) => showcase.getByText(/^The courses could not be loaded/u),
    name: "the courses cannot be loaded",
    settle: async (request: Route) => request.abort(),
  },
  {
    filled: (showcase: Locator) => showcase.getByText(NO_COURSES),
    name: "no course is published",
    settle: answerNoCourses,
  },
] as const

const measureCourses = (article: Element) => {
  const section = article.children.item(2)
  const content = section?.firstElementChild
  if (!section || !content) {
    throw new Error("The course showcase has no section of courses to measure")
  }

  const style = getComputedStyle(section)
  return {
    children: section.childElementCount,
    content: content.getBoundingClientRect().height,
    inner: section.getBoundingClientRect().height - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom),
    line: Number.parseFloat(getComputedStyle(content).lineHeight),
  }
}

const recordLayoutShifts = (key: string): void => {
  const shifts: number[] = []
  Reflect.set(window, key, shifts)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      shifts.push(entry.startTime)
    }
  }).observe({ buffered: true, type: "layout-shift" })
}

const afterTwoFrames = async (page: Page): Promise<void> => {
  await page.evaluate(
    async () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve()
          })
        })
      }),
  )
}

test.describe("landing page", () => {
  test("renders hero, navigation, and primary CTA", async ({ landingPage }) => {
    await landingPage.goto()

    await expect(landingPage.navigation()).toBeVisible()
    await expect(landingPage.heroHeading()).toBeVisible()
    await expect(landingPage.navigationGetStartedLink()).toBeVisible()
    await expect(landingPage.heroGetStartedLink()).toBeVisible()
  })

  test("navbar progress follows scrolling down and back up", async ({ landingPage, page }) => {
    await landingPage.goto()
    const line = landingPage.navigation().locator(':scope > div[aria-hidden="true"]')
    const headerWidth = await landingPage.navigation().evaluate((header) => header.getBoundingClientRect().width)

    await page.waitForFunction(() => document.documentElement.scrollHeight > window.innerHeight)

    for (const progress of [0.25, 0.75, 0.1, 0]) {
      await expect
        .poll(async () => {
          await page.evaluate((fraction) => {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
            window.scrollTo({ behavior: "instant", top: scrollHeight * fraction })
          }, progress)

          return (await line.boundingBox())?.width
        })
        .toBeCloseTo(headerWidth * progress, -1)
      await expect(line).toHaveCSS("height", "1px")
    }
  })

  test("prefixed locale route renders localized landing page", async ({ landingPage, page }) => {
    await landingPage.goto("/pl")

    await expect(page).toHaveURL(/\/pl-PL\/?$/u)
    await expect(landingPage.heroHeading()).toBeVisible()
    await expect(page.locator("html")).toHaveAttribute("lang", "pl-PL")
    expect(await page.context().cookies()).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "saasyland.com_locale", value: "pl-PL" })]),
    )
  })

  test("course showcase lists real courses with their open and locked lessons", async ({ landingPage, page }) => {
    await landingPage.goto()
    const showcase = landingPage.courseShowcase()
    await showcase.scrollIntoViewIfNeeded()

    await expect(showcase.getByRole("link", { exact: true, name: TEST_COURSE.title["en-US"] })).toHaveAttribute(
      "href",
      `/courses/${TEST_COURSE.slug}`,
    )
    const tile = showcase.getByRole("listitem").filter({ has: page.getByRole("link", { exact: true, name: TEST_COURSE.title["en-US"] }) })
    await expect(tile.getByText(`3 of ${String(TEST_LESSONS.length)} lessons ready`)).toBeVisible()
    await expect(tile.getByRole("link", { name: `${freeLesson.title["en-US"]} Free preview` })).toBeVisible()
    await expect(tile.getByRole("link", { name: `${accountLesson.title["en-US"]} Locked: free with an account` })).toContainText(
      "Free with an account",
    )
    await expect(tile.getByRole("link", { name: `${paidLesson.title["en-US"]} Locked: included with Complete` })).toBeVisible()
    await expect(tile.getByRole("link", { name: new RegExp(recordingLesson.title["en-US"], "u") })).toHaveCount(0)
    await expect(tile.getByText(recordingLesson.title["en-US"])).toBeVisible()
    await expect(tile.getByRole("listitem").filter({ hasText: recordingLesson.title["en-US"] })).toContainText("Coming soon")
    await expect(tile.getByRole("link", { name: "+ 1 more lesson" })).toHaveAttribute("href", `/courses/${TEST_COURSE.slug}`)
    await expect(showcase.getByRole("link", { name: "Browse all courses" })).toHaveAttribute("href", "/courses")

    await tile.getByRole("link", { name: new RegExp(`^${freeLesson.title["en-US"]}`, "u") }).click()
    await expect(page).toHaveURL(`/courses/${TEST_COURSE.slug}/${freeLesson.slug}`)
    await expect(page.getByRole("heading", { level: 1, name: freeLesson.title["en-US"] })).toBeVisible()
  })

  test("each lesson in the course showcase centres its badge's label on one line with its length, the same gap below its title", async ({
    landingPage,
    page,
  }) => {
    for (const viewport of BADGE_VIEWPORTS) {
      await page.setViewportSize(viewport)
      await landingPage.goto()
      const showcase = landingPage.courseShowcase()
      await showcase.scrollIntoViewIfNeeded()
      const seeded = showcase.getByRole("link", { exact: true, name: TEST_COURSE.title["en-US"] })
      await expect(seeded).toBeVisible()
      await page.evaluate(async () => {
        await document.fonts.ready
      })

      const tile = showcase.getByRole("listitem").filter({ has: page.getByRole("link", { exact: true, name: TEST_COURSE.title["en-US"] }) })
      const layout = await badgeLayout(tile)
      const label = `${String(viewport.width)}px`
      expect(layout.badges, label).toBeGreaterThan(0)
      expect(layout.inkOffset, label).toBeLessThanOrEqual(BADGE_INK_TOLERANCE_PX)
      expect(layout.metaDrift, label).toBeLessThanOrEqual(META_ROW_TOLERANCE_PX)
      expect(layout.titleGaps.length, label).toBeGreaterThan(0)
      for (const gap of layout.titleGaps) {
        expect(Math.abs(gap - META_GAP_PX), label).toBeLessThanOrEqual(TITLE_GAP_TOLERANCE_PX)
      }
    }
  })

  test("course tour plays in place from its poster", async ({ landingPage }) => {
    await landingPage.goto()
    const showcase = landingPage.courseShowcase()
    const video = showcase.getByLabel("Tour of the course pages")
    await showcase.scrollIntoViewIfNeeded()
    await expect(video).toHaveCount(0)

    await showcase.getByRole("button", { name: "Play the tour of the course pages" }).click()

    await expect(video).toBeFocused()
    await expect(video).toHaveAttribute("controls")
    await expect.poll(async () => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0)
    await expect(showcase.locator("picture")).toBeHidden()
  })
})

const holdCourses = async (page: Page, settle: (request: Route) => Promise<void>) => {
  const requested = Promise.withResolvers<void>()
  const released = Promise.withResolvers<void>()
  await page.route(SERVER_FUNCTION, async (route) => {
    requested.resolve()
    await released.promise
    await settle(route)
  })

  return { release: released.resolve, requested: requested.promise }
}

test.describe("the course block", () => {
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "wait" })
  })

  for (const { maxEmptyLines, name, viewport } of COURSE_BLOCK_VIEWPORTS) {
    for (const outcome of COURSE_BLOCK_OUTCOMES) {
      test(`is as tall as what it shows on a ${name} when ${outcome.name}`, async ({ landingPage, page }) => {
        await page.setViewportSize(viewport)
        await landingPage.goto()
        const showcase = landingPage.courseShowcase()
        const courses = await holdCourses(page, outcome.settle)

        await showcase.evaluate((article) => {
          window.scrollTo({ behavior: "instant", top: window.scrollY + article.getBoundingClientRect().bottom - window.innerHeight / 2 })
        })
        await courses.requested
        await expect(showcase).toHaveAttribute("aria-busy", "true")

        courses.release()
        await expect(outcome.filled(showcase)).toBeVisible({ timeout: COURSES_FAILED_TIMEOUT_MS })
        await expect(showcase).toHaveAttribute("aria-busy", "false")
        await afterTwoFrames(page)
        const filled = await showcase.evaluate(measureCourses)

        expect(filled.children).toBe(1)
        expect(filled.inner).toBeCloseTo(filled.content, 1)
      })
    }

    test(`says in at most ${String(maxEmptyLines)} lines of text on a ${name} that no course is published`, async ({ landingPage, page }) => {
      await page.setViewportSize(viewport)
      await landingPage.goto()
      const showcase = landingPage.courseShowcase()
      await page.route(SERVER_FUNCTION, answerNoCourses)

      await showcase.scrollIntoViewIfNeeded()
      await expect(showcase.getByText(NO_COURSES)).toBeVisible()
      const empty = await showcase.evaluate(measureCourses)

      const lines = Math.round(empty.inner / empty.line)
      expect(empty.inner).toBeCloseTo(empty.line * lines, 1)
      expect(lines).toBeGreaterThan(0)
      expect(lines).toBeLessThanOrEqual(maxEmptyLines)
    })

    test(`moves nothing on a ${name} screen when the courses fill the block below it`, async ({ browserName, landingPage, page }) => {
      test.skip(browserName !== "chromium", "Layout shift entries are a Chromium API")
      await page.setViewportSize(viewport)
      await page.addInitScript(recordLayoutShifts, LAYOUT_SHIFTS_KEY)
      await landingPage.goto()
      const showcase = landingPage.courseShowcase()
      const courses = await holdCourses(page, async (request) => request.continue())

      await showcase.evaluate((article) => {
        window.scrollTo({ behavior: "instant", top: window.scrollY + article.getBoundingClientRect().top - window.innerHeight + 1 })
      })
      await courses.requested
      await afterTwoFrames(page)
      const since = await page.evaluate(() => performance.now())

      courses.release()
      await expect(showcase).toHaveAttribute("aria-busy", "false")
      await afterTwoFrames(page)
      const shifts = await page.evaluate(
        ({ key, start }) => Reflect.get(window, key).filter((time: number) => time >= start),
        { key: LAYOUT_SHIFTS_KEY, start: since },
      )

      expect(shifts).toEqual([])
    })
  }
})

test.describe("server rendering and client navigation", () => {
  test("pricing navigates to sign-up without reloading the document", async ({ appPage, page }) => {
    await page.goto("/")
    await appPage.waitForAppReady()
    await page.evaluate(() => (document.documentElement.dataset["navigationProbe"] = "same-document"))
    await page.locator('#pricing a[href^="/auth/sign-up"]').first().click()
    await page.waitForURL((url) => url.pathname.endsWith("/auth/sign-up"))
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.locator("html")).toHaveAttribute("data-navigation-probe", "same-document")
  })

  test("landing keeps its responsive styles after visiting the docs", async ({ appPage, page }) => {
    await page.goto("/")
    await appPage.waitForAppReady()
    await page.locator('header a[href="/docs"]').first().click()
    await expect(page.getByRole("heading", { level: 1, name: "Documentation" })).toBeVisible()
    await page.locator('a[href="/"]:visible').first().click()
    await page.waitForURL((url) => url.pathname === "/")
    await expect(page.locator("h1 svg")).toBeVisible()
    await expect(page.locator('header a[href="/docs"]').first()).toBeVisible()
  })
})

test.describe("a page that is still loading", () => {
  test("reports no error when a visitor leaves while its animations load", async ({ landingPage, page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    const features = Promise.withResolvers<Route>()
    await page.route(MOTION_FEATURES_CHUNK, (route) => {
      features.resolve(route)
    })
    await landingPage.goto()

    await landingPage.leaveWhileLoading(await features.promise, ROUTES.PRIVACY)

    await expect(page).toHaveURL(ROUTES.PRIVACY)
    expect(errors).toEqual([])
  })
})

test.describe("a browser whose clock reads 1 January of a later year, east of UTC", () => {
  test.use({ timezoneId: BROWSER_TIMEZONE })

  test("hydrates the copyright year the build printed", async ({ appPage, page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.clock.setSystemTime(BROWSER_TIME)

    const response = await page.goto("/", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    const html = (await response?.text()) ?? ""
    await appPage.waitForAppReady()
    const footer = page.getByRole("contentinfo")
    await appPage.waitForHydration(footer)
    const printed = await footer.getByText(/^© /u).innerText()

    expect(html, `the build printed "${printed}"`).toContain(printed)
    expect(errors).toEqual([])
  })
})
