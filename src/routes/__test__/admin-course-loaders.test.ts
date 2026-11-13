import { createMemoryHistory } from "@tanstack/react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { courseEditorQuery } from "~/src/modules/course/use-cases/get-course-editor"
import { getCoursesQuery } from "~/src/modules/course/use-cases/get-courses"

import { getRouter } from "~/src/router"

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"

const loadAsAdmin = async (path: string) => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: USERS.VISITOR }))
  const router = getRouter()
  router.options.context.queryClient.setDefaultOptions({ queries: { retry: false } })
  router.update({ context: router.options.context, history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("admin course route loaders", () => {
  it("loads the course list with its page metadata", async () => {
    const router = await loadAsAdmin("/admin/courses")

    expect(router.state.matches.at(-1)?.loaderData).toHaveProperty("metadata.title", "Courses")
    expect(router.options.context.queryClient.getQueryData(getCoursesQuery.queryKey)).toHaveProperty("total", 3)
  })

  it("loads the create page with its page metadata", async () => {
    const router = await loadAsAdmin("/admin/courses/create")

    expect(router.state.matches.at(-1)?.loaderData).toHaveProperty("metadata.title", "New course")
  })

  it("titles the editor after the course and loads its curriculum", async () => {
    const router = await loadAsAdmin(`/admin/courses/${IDS.COURSE}`)

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

  it("answers a missing course with not found", async () => {
    const router = await loadAsAdmin(`/admin/courses/${MISSING_ID}`)

    expect(router.state.matches.some((match) => match.status === "notFound")).toBe(true)
  })
})
