import { createMemoryHistory } from "@tanstack/react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { LESSON_QUERY_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"

import { getRouter } from "~/src/router"

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

const load = async (path: string) => {
  const router = getRouter()
  router.options.context.queryClient.setDefaultOptions({ queries: { retry: false } })
  router.update({ context: router.options.context, history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router
}

const signOut = (): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("course route loaders", () => {
  it("loads the catalogue with its page metadata", async () => {
    signOut()

    const router = await load("/courses")

    expect(router.state.matches.at(-1)?.status).toBe("success")
    expect(router.state.matches.at(-1)?.loaderData).toHaveProperty("metadata.title", "Courses")
  })

  it("titles the course page after the course", async () => {
    signOut()

    const router = await load("/courses/the-walkthrough")

    expect(router.state.matches.at(-1)?.loaderData).toStrictEqual({
      locale: "en-US",
      pathname: "/courses/the-walkthrough",
      summary: "How it works.",
      title: "The walkthrough",
    })
  })

  it("signs the stream before rendering a lesson the viewer may watch", async () => {
    signOut()

    const router = await load("/courses/the-walkthrough/boundaries")

    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      pathname: "/courses/the-walkthrough/boundaries",
      title: "Boundaries · The walkthrough",
    })
    expect(
      router.options.context.queryClient.getQueryData(
        lessonPlaybackQuery({ courseSlug: "the-walkthrough", lessonSlug: "boundaries" }).queryKey,
      ),
    ).toHaveProperty("src")
  })

  it.each([
    { name: "a locked lesson", path: "/courses/the-walkthrough/billing", role: ROLE_CODES.CUSTOMER },
    { name: "a lesson without a recording", path: "/courses/the-walkthrough/coverage", role: ROLE_CODES.ADMIN },
  ])("does not sign a stream for $name", async ({ path, role }) => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))

    const router = await load(path)

    expect(router.state.matches.at(-1)?.status).toBe("success")
    expect(router.options.context.queryClient.getQueryCache().findAll({ queryKey: LESSON_QUERY_KEYS.ALL })).toStrictEqual([])
  })

  it.each(["/courses/missing", "/courses/unreleased", "/courses/the-walkthrough/missing"])("answers %s with not found", async (path) => {
    signOut()

    const router = await load(path)

    expect(router.state.matches.some((match) => match.status === "notFound")).toBe(true)
  })
})
