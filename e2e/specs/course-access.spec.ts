import { LESSON_ACCESS } from "../../src/modules/lesson/lesson.constants"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const [, customer] = TEST_ACCOUNTS
const [, , paid] = TEST_LESSONS
const PAID_LESSONS = TEST_LESSONS.filter(({ access }) => access === LESSON_ACCESS.PAID).length

test.describe("course access through a licence", () => {
  test.beforeEach(async ({ authPage, page }) => {
    await authPage.signIn(customer.email)
    await expect(page).toHaveURL("/app")
  })

  test("a customer without Complete is offered it on a paid lesson", async ({ page }) => {
    await page.goto(`/courses/${TEST_COURSE.slug}/${paid.slug}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await expect(page.getByRole("heading", { name: "This lesson comes with Complete" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Get Complete" })).toHaveAttribute("href", `/app/license?tier=${LICENSE_TIER.COMPLETE}`)
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
