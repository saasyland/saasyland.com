import { TIER_PRICES } from "../../src/data/marketing"
import { LESSON_ACCESS } from "../../src/modules/lesson/lesson.constants"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import * as ROUTES from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { expect, test } from "../fixtures/auth"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [, customer] = TEST_ACCOUNTS
const [, , paid] = TEST_LESSONS
const PAID_LESSONS = TEST_LESSONS.filter(({ access }) => access === LESSON_ACCESS.PAID).length

test("a visitor sees the price on a paid lesson, and one who has Complete signs in and comes back to it", async ({ appPage, page }) => {
  const lesson = `/courses/${TEST_COURSE.slug}/${paid.slug}`
  await page.goto(lesson, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()

  await expect(page.getByText(`Complete · $${String(TIER_PRICES[LICENSE_TIER.COMPLETE])} one-time`, { exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Get Complete" })).toHaveAttribute(
    "href",
    `/auth/sign-up?redirect=${encodeURIComponent(`/app/license?redirect=${encodeURIComponent(lesson)}&tier=${LICENSE_TIER.COMPLETE}`)}`,
  )
  await expect(page.getByText("Already have Complete?").getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    `/auth/sign-in?redirect=${encodeURIComponent(lesson)}`,
  )
})

test.describe("course access through a licence", () => {
  test.beforeEach(async ({ authPage, page }) => {
    await authPage.signIn(customer.email)
    await expect(page).toHaveURL("/app")
  })

  test("a customer without Complete is offered it on a paid lesson", async ({ page }) => {
    await page.goto(`/courses/${TEST_COURSE.slug}/${paid.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await expect(page.getByRole("heading", { name: "This lesson comes with Complete" })).toBeVisible()
    await expect(page.getByText(`Complete · $${String(TIER_PRICES[LICENSE_TIER.COMPLETE])} one-time`, { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Get Complete" })).toHaveAttribute(
      "href",
      `/app/license?redirect=${encodeURIComponent(`/courses/${TEST_COURSE.slug}/${paid.slug}`)}&tier=${LICENSE_TIER.COMPLETE}`,
    )
    await expect(page.getByText("Already have Complete?")).toHaveCount(0)
  })

  test("the workspace sidebar links to the courses with the lessons the customer has finished", async ({ appPage, page }) => {
    await appPage.waitForAppReady()

    const navigation = page.getByRole("navigation", { name: "App navigation", exact: true })
    await expect(navigation.getByText(/^\d+ of \d+ lessons completed$/u)).toBeAttached()
    await navigation.getByRole("link", { name: "Courses", exact: true }).click()

    await expect(page).toHaveURL(ROUTES.COURSES)
    await expect(page.getByRole("link", { name: new RegExp(TEST_COURSE.title["en-US"], "u") }).first()).toBeVisible()
  })

  test("a customer without Complete sees the locked courses beside the licence offer", async ({ appPage, page }) => {
    await appPage.waitForAppReady()

    const courses = page.getByRole("region", { name: "Courses included with Complete and Agency" })
    await expect(courses).toContainText(`Your account cannot open ${String(PAID_LESSONS)} lessons in 1 course yet.`)
    await expect(courses.getByRole("link", { name: new RegExp(TEST_COURSE.title["en-US"], "u") })).toHaveAttribute(
      "href",
      `/courses/${TEST_COURSE.slug}`,
    )
  })
})
