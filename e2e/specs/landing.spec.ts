import type { Route } from "@playwright/test"

import { ROUTES } from "../../src/routes"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [freeLesson] = TEST_LESSONS
const MOTION_FEATURES_CHUNK = /\/assets\/motion\.features-[\w-]+\.js$/u
const BROWSER_TIMEZONE = "Pacific/Kiritimati"
const BROWSER_TIME = new Date("2099-01-01T00:05:00+14:00")

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
    const viewportWidth = await page.evaluate(() => window.innerWidth)

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
        .toBeCloseTo(viewportWidth * progress, -1)
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

  test("course showcase links the published course and its lessons to their pages", async ({ landingPage, page }) => {
    await landingPage.goto()
    const showcase = landingPage.courseShowcase()
    await showcase.scrollIntoViewIfNeeded()

    await expect(showcase.getByRole("link", { exact: true, name: TEST_COURSE.title["en-US"] })).toHaveAttribute(
      "href",
      `/courses/${TEST_COURSE.slug}`,
    )
    for (const lesson of TEST_LESSONS) {
      await expect(showcase.getByRole("link", { name: new RegExp(`^${lesson.title["en-US"]}`, "u") })).toHaveAttribute(
        "href",
        `/courses/${TEST_COURSE.slug}/${lesson.slug}`,
      )
    }
    await expect(showcase.getByRole("link", { name: "Browse all courses" })).toHaveAttribute("href", "/courses")

    await showcase.getByRole("link", { name: /^Watch a free lesson/u }).click()
    await expect(page).toHaveURL(`/courses/${TEST_COURSE.slug}/${freeLesson.slug}`)
    await expect(page.getByRole("heading", { level: 1, name: freeLesson.title["en-US"] })).toBeVisible()
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
