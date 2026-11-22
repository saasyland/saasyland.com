import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { LESSON_IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { TEST_COURSE_ACCESS } from "~/src/modules/course/__test__/fixtures/course-access"
import { lessonQuery } from "~/src/modules/lesson/use-cases/get-lesson"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"

vi.mock("~/src/data/course-access.entries", () => import("~/src/modules/course/__test__/fixtures/course-access"))

const COURSE_SLUG = "the-walkthrough"

const [grant] = TEST_COURSE_ACCESS

const OPENINGS = [
  {
    name: "the lesson page",
    open: (lessonSlug: string) => executeQuery(lessonQuery({ courseSlug: COURSE_SLUG, lessonSlug, locale: "en-US" })),
  },
  { name: "the lesson's video", open: (lessonSlug: string) => executeQuery(lessonPlaybackQuery({ courseSlug: COURSE_SLUG, lessonSlug })) },
] as const

const signIn = (userId: string, role: string = ROLE_CODES.CUSTOMER): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId }))
}

beforeEach(async () => {
  await seedCatalogue()
  grant.recordUse.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe.each(OPENINGS)("opening $name", ({ open }) => {
  it("records a paid lesson as a use of the course access that unlocked it", async () => {
    signIn(USERS.ENTITLED)

    await open("billing")

    expect(grant.recordUse).toHaveBeenCalledExactlyOnceWith({ lessonId: LESSON_IDS.PAID, userId: USERS.ENTITLED })
  })

  it.each([
    { name: "a free preview", slug: "boundaries" },
    { name: "a lesson for any account", slug: "sessions" },
  ])("records no use for $name, even for a holder of course access", async ({ slug }) => {
    signIn(USERS.ENTITLED)

    await open(slug)

    expect(grant.recordUse).not.toHaveBeenCalled()
  })

  it("records no use when staff open a paid lesson without course access", async () => {
    signIn(USERS.VISITOR, ROLE_CODES.ADMIN)

    await open("billing")

    expect(grant.recordUse).not.toHaveBeenCalled()
  })

  it("records no use when a visitor opens a free preview", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())

    await open("boundaries")

    expect(grant.recordUse).not.toHaveBeenCalled()
  })
})

it("records no use when a paid lesson stays locked", async () => {
  signIn(USERS.VISITOR)

  const { lesson } = await executeQuery(lessonQuery({ courseSlug: COURSE_SLUG, lessonSlug: "billing", locale: "en-US" }))

  expect(lesson.locked).toBe(true)
  expect(grant.recordUse).not.toHaveBeenCalled()
})
