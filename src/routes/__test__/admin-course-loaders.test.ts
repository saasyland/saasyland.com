import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

import { IDS, LESSON_IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { courseEditorQuery } from "~/src/modules/course/use-cases/get-course-editor"
import { getCoursesQuery } from "~/src/modules/course/use-cases/get-courses"

import { expectLocalizedAdminPage, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"

const ADMIN_SESSION = createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: USERS.VISITOR })

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("admin course route loaders", () => {
  it.each(["/admin/courses/create", "/admin/videos"])("loads localized metadata for an authorized administrator at %s", async (path) => {
    expectLocalizedAdminPage(await loadAsAdmin(path, ADMIN_SESSION))
  })

  it("loads the course list with its page metadata", async () => {
    const router = await loadAsAdmin("/admin/courses", ADMIN_SESSION)

    expect(router.state.matches.at(-1)?.loaderData).toHaveProperty("metadata.title", "Courses")
    expect(router.options.context.queryClient.getQueryData(getCoursesQuery.queryKey)).toHaveProperty("total", 3)
  })

  it("loads the create page with its page metadata", async () => {
    const router = await loadAsAdmin("/admin/courses/create", ADMIN_SESSION)

    expect(router.state.matches.at(-1)?.loaderData).toHaveProperty("metadata.title", "New course")
  })

  it("titles the editor after the course and loads its curriculum", async () => {
    const router = await loadAsAdmin(`/admin/courses/${IDS.COURSE}`, ADMIN_SESSION)

    expect(router.state.matches.at(-1)?.loaderData).toStrictEqual({
      locale: "en-US",
      pathname: `/admin/courses/${IDS.COURSE}`,
      title: "The walkthrough",
    })
    expect(router.options.context.queryClient.getQueryData(courseEditorQuery({ courseId: IDS.COURSE }).queryKey)).toHaveProperty(
      "chapters.length",
      2,
    )
  })

  it("titles the lesson editor after the lesson and its course", async () => {
    const router = await loadAsAdmin(`/admin/courses/${IDS.COURSE}/lessons/${LESSON_IDS.PAID}`, ADMIN_SESSION)

    expect(router.state.matches.at(-1)?.loaderData).toStrictEqual({
      locale: "en-US",
      pathname: `/admin/courses/${IDS.COURSE}/lessons/${LESSON_IDS.PAID}`,
      title: "Billing · The walkthrough",
    })
  })

  it.each([`/admin/courses/${IDS.COURSE}/lessons/${MISSING_ID}`, `/admin/courses/${MISSING_ID}/lessons/${LESSON_IDS.PAID}`])(
    "answers %s with not found",
    async (path) => {
      const router = await loadAsAdmin(path, ADMIN_SESSION)

      expect(router.state.matches.some((match) => match.status === "notFound")).toBe(true)
    },
  )

  it("answers a missing course with not found", async () => {
    const router = await loadAsAdmin(`/admin/courses/${MISSING_ID}`, ADMIN_SESSION)

    expect(router.state.matches.some((match) => match.status === "notFound")).toBe(true)
  })
})
