import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation, executeQuery } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { IDS, LESSON_IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import { saveLessonProgressMutation } from "~/src/modules/lesson-progress/use-cases/save-lesson-progress"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"

const COURSE_SLUG = "the-walkthrough"

const signIn = (userId: string, role: string = ROLE_CODES.CUSTOMER): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId }))
}

const signOut = (): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())
}

const playback = (lessonSlug: string) => executeQuery(lessonPlaybackQuery({ courseSlug: COURSE_SLUG, lessonSlug }))

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getLessonPlayback", () => {
  it("signs a free preview for a visitor", async () => {
    signOut()

    const sources = await playback("boundaries")

    expect(sources.src).toMatch(new RegExp(`^/media/[\\da-z]+\\.[\\da-f]{64}/${IDS.VIDEO}/master\\.m3u8$`, "u"))
    expect(sources.captions.map(({ locale }) => locale)).toStrictEqual(["en-US"])
  })

  it("asks a visitor to sign in for an account lesson", async () => {
    signOut()

    await expect(playback("sessions")).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  })

  it("lets any account watch an account lesson", async () => {
    signIn(USERS.VISITOR)

    await expect(playback("sessions")).resolves.toHaveProperty("src")
  })

  it.each([
    { name: "an account without a licence", user: USERS.VISITOR },
    { name: "a Core licence", user: USERS.CORE_BUYER },
    { name: "a revoked licence", user: USERS.REFUNDED },
  ])("refuses a paid lesson to $name", async ({ user }) => {
    signIn(user)

    await expect(playback("billing")).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })

  it.each([
    { name: "a Complete licence", role: ROLE_CODES.CUSTOMER, user: USERS.BUYER },
    { name: "staff", role: ROLE_CODES.ADMIN, user: USERS.VISITOR },
  ])("signs a paid lesson for $name", async ({ role, user }) => {
    signIn(user, role)

    await expect(playback("billing")).resolves.toHaveProperty("src")
  })

  it.each([
    { name: "a lesson without a recording", slug: "coverage" },
    { name: "an unpublished lesson", slug: "unfinished" },
    { name: "a missing lesson", slug: "missing" },
  ])("reports $name as not found", async ({ slug }) => {
    signIn(USERS.VISITOR, ROLE_CODES.ADMIN)

    await expect(playback(slug)).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("reports a lesson of an unpublished course as not found", async () => {
    signIn(USERS.VISITOR, ROLE_CODES.ADMIN)

    await expect(executeQuery(lessonPlaybackQuery({ courseSlug: "unreleased", lessonSlug: "boundaries" }))).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )
  })
})

const progressOf = async (lessonId: string) => {
  const rows = await db.select().from(lessonProgress)
  return rows.find((row) => row.lessonId === lessonId)
}

describe("saveLessonProgress", () => {
  it("records the position and keeps the first completion", async () => {
    signIn(USERS.VISITOR)

    await executeMutation(saveLessonProgressMutation, { completed: false, lessonId: LESSON_IDS.ACCOUNT, positionMs: 30_000 })
    expect(await progressOf(LESSON_IDS.ACCOUNT)).toMatchObject({ completedAt: null, positionMs: 30_000, userId: USERS.VISITOR })

    await executeMutation(saveLessonProgressMutation, { completed: true, lessonId: LESSON_IDS.ACCOUNT, positionMs: 0 })
    const completed = await progressOf(LESSON_IDS.ACCOUNT)
    expect(completed?.completedAt).toBeInstanceOf(Date)

    await expect(
      executeMutation(saveLessonProgressMutation, { completed: false, lessonId: LESSON_IDS.ACCOUNT, positionMs: 5000 }),
    ).resolves.toStrictEqual({
      completed: false,
      lessonId: LESSON_IDS.ACCOUNT,
    })
    expect(await progressOf(LESSON_IDS.ACCOUNT)).toMatchObject({ completedAt: completed?.completedAt, positionMs: 5000 })
  })

  it("requires an account", async () => {
    signOut()

    await expect(
      executeMutation(saveLessonProgressMutation, { completed: false, lessonId: LESSON_IDS.PREVIEW, positionMs: 0 }),
    ).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  })

  it("refuses a lesson the viewer cannot watch", async () => {
    signIn(USERS.VISITOR)

    await expect(
      executeMutation(saveLessonProgressMutation, { completed: true, lessonId: LESSON_IDS.PAID, positionMs: 0 }),
    ).rejects.toThrow(ERROR_CODES.FORBIDDEN)
    expect(await progressOf(LESSON_IDS.PAID)).toBeUndefined()
  })

  it.each([LESSON_IDS.DRAFT, "missing"])("reports the lesson %s as not found", async (lessonId) => {
    signIn(USERS.BUYER)

    await expect(executeMutation(saveLessonProgressMutation, { completed: false, lessonId, positionMs: 0 })).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )
  })
})
