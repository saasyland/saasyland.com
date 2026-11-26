import { createMemoryHistory } from "@tanstack/react-router"
import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { IDS, LESSON_IDS, USERS, makeTextLesson, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import { LESSON_QUERY_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lessonQuery } from "~/src/modules/lesson/use-cases/get-lesson"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"

import { ROBOTS, buildTitle } from "~/src/lib/seo"

import notFoundMessages from "~/messages/en-US/errors.not-found.json"
import { APP_URL } from "~/src/presentation/branding"
import { getRouter } from "~/src/router"
import { ROUTES } from "~/src/routes"

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

  it("keeps the catalogue out of search results while no course is published", async () => {
    signOut()
    await db.update(course).set({ status: COURSE_STATUS.DRAFT })

    const router = await load("/courses")

    expect(router.state.matches.at(-1)?.meta).toContainEqual({ content: ROBOTS.NOINDEX, name: "robots" })
  })

  it("leaves the catalogue to search engines once a course is published", async () => {
    signOut()

    const router = await load("/courses")

    expect(router.state.matches.at(-1)?.meta).not.toContainEqual(expect.objectContaining({ name: "robots" }))
  })

  it.each([
    ["/courses/the-walkthrough/boundaries", false],
    ["/courses/the-walkthrough/sessions", true],
    ["/courses/the-walkthrough/billing", true],
    ["/courses/the-walkthrough/coverage", true],
  ])("keeps %s out of search results unless a signed-out visitor may watch it: %s", async (path, hidden) => {
    signOut()
    const cover = `covers/${IDS.COURSE}/0195a2b4-6c8d-7e9f-8a0b-00000000c0e1.webp`
    await db.update(course).set({ cover }).where(eq(course.id, IDS.COURSE))

    const router = await load(path)
    const meta = router.state.matches.at(-1)?.meta

    expect(meta?.some((tag) => tag?.name === "robots" && tag.content === ROBOTS.NOINDEX)).toBe(hidden)
    expect(meta).toContainEqual({ content: `${APP_URL}/media/${cover}`, property: "og:image" })
  })

  it("titles the course page after the course", async () => {
    signOut()

    const router = await load("/courses/the-walkthrough")

    expect(router.state.matches.at(-1)?.loaderData).toStrictEqual({
      cover: null,
      locale: "en-US",
      pathname: "/courses/the-walkthrough",
      summary: "How it works.",
      title: "The walkthrough",
    })
  })

  it("shares the course's cover as its link preview image", async () => {
    signOut()
    const cover = `covers/${IDS.COURSE}/0195a2b4-6c8d-7e9f-8a0b-00000000c0e1.webp`
    await db.update(course).set({ cover }).where(eq(course.id, IDS.COURSE))

    const router = await load("/courses/the-walkthrough")
    const page = router.state.matches.at(-1)

    expect(page?.meta).toContainEqual({ content: `${APP_URL}/media/${cover}`, property: "og:image" })
    expect(page?.meta).toContainEqual({ content: "image/webp", property: "og:image:type" })
    expect(page?.meta).toContainEqual({ content: "The walkthrough", property: "og:image:alt" })
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
    expect(
      router.options.context.queryClient.getQueryData(
        lessonQuery({ courseSlug: "the-walkthrough", lessonSlug: "boundaries", locale: "en-US" }).queryKey,
      ),
    ).toHaveProperty("lesson.slug", "boundaries")
  })

  it("does not sign a stream for a text lesson", async () => {
    signOut()
    await makeTextLesson(LESSON_IDS.PREVIEW)

    const router = await load("/courses/the-walkthrough/boundaries")

    expect(router.state.matches.at(-1)?.status).toBe("success")
    expect(router.options.context.queryClient.getQueryCache().findAll({ queryKey: LESSON_QUERY_KEYS.PLAYBACK })).toStrictEqual([])
  })

  it.each([
    { name: "a locked lesson", path: "/courses/the-walkthrough/billing", role: ROLE_CODES.CUSTOMER },
    { name: "a lesson without a recording", path: "/courses/the-walkthrough/coverage", role: ROLE_CODES.ADMIN },
  ])("does not sign a stream for $name", async ({ path, role }) => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))

    const router = await load(path)

    expect(router.state.matches.at(-1)?.status).toBe("success")
    expect(router.options.context.queryClient.getQueryCache().findAll({ queryKey: LESSON_QUERY_KEYS.PLAYBACK })).toStrictEqual([])
  })

  it.each(["/courses/missing", "/courses/unreleased", "/courses/the-walkthrough/missing"])(
    "answers %s with the not-found page, titled and kept out of search results",
    async (path) => {
      signOut()

      const router = await load(path)
      const missing = router.state.matches.find((match) => match.status === "notFound")

      expect(missing?.meta).toContainEqual({ title: buildTitle({ locale: I18N.DEFAULT_LOCALE, title: notFoundMessages.metadata.title }) })
      expect(missing?.meta).toContainEqual({ content: ROBOTS.NOINDEX, name: "robots" })
    },
  )

  it.each(["/courses/the-walkthrough", "/courses/the-walkthrough/boundaries"])(
    "keeps the catalogue as the address of %s when its course fails to load",
    async (path) => {
      vi.spyOn(auth.api, "getSession").mockRejectedValue(new Error("The session store is unavailable"))

      const router = await load(path)
      const failed = router.state.matches.find((match) => match.status === "error")

      expect(failed?.meta).toContainEqual({ content: `${APP_URL}${ROUTES.COURSES}`, property: "og:url" })
    },
  )
})
