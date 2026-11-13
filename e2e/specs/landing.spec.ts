import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { expect, test } from "../fixtures/test"

const [freeLesson] = TEST_LESSONS

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
