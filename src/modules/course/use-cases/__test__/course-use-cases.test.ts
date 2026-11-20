import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { IDS, LESSON_IDS, USERS, playLessonOn, recordProgress, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { courseQuery } from "~/src/modules/course/use-cases/get-course"

vi.mock("~/src/data/course-access.entries", () => import("~/src/modules/course/__test__/fixtures/course-access"))

const signIn = (userId: string, role: string = ROLE_CODES.CUSTOMER): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId }))
}

const signOut = (): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())
}

const lockedBySlug = async () => {
  const page = await executeQuery(courseQuery({ locale: "en-US", slug: "the-walkthrough" }))
  return Object.fromEntries(page.chapters.flatMap(({ lessons }) => lessons).map(({ locked, slug }) => [slug, locked]))
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getCatalogue", () => {
  it("lists published courses in order with their size, free lessons and paid lessons", async () => {
    signOut()

    const courses = await executeQuery(catalogueQuery({ locale: "en-US" }))

    expect(courses).toStrictEqual([
      {
        durationMs: 375_000,
        icon: COURSE_ICON.BOOK_OPEN,
        id: IDS.COURSE,
        kind: COURSE_KIND.COURSE,
        lessons: 4,
        level: COURSE_LEVEL.BEGINNER,
        paid: 2,
        previews: 1,
        slug: "the-walkthrough",
        summary: "How it works.",
        title: "The walkthrough",
      },
      {
        durationMs: 0,
        icon: COURSE_ICON.BOOK_OPEN,
        id: IDS.TUTORIAL,
        kind: COURSE_KIND.TUTORIAL,
        lessons: 0,
        level: COURSE_LEVEL.BEGINNER,
        paid: 0,
        previews: 0,
        slug: "one-off",
        summary: "A short one.",
        title: "One-off tutorial",
      },
    ])
  })

  it("leaves lessons on the placeholder video out of the length", async () => {
    signOut()
    await playLessonOn(LESSON_IDS.PREVIEW, IDS.PLACEHOLDER_VIDEO)

    const [walkthrough] = await executeQuery(catalogueQuery({ locale: "en-US" }))

    expect(walkthrough).toMatchObject({ durationMs: 250_000, lessons: 4 })
  })

  it("localizes titles and falls back to English", async () => {
    signOut()

    const courses = await executeQuery(catalogueQuery({ locale: "pl-PL" }))

    expect(courses.map(({ summary, title }) => [title, summary])).toStrictEqual([
      ["Przewodnik", "Jak to działa."],
      ["One-off tutorial", "A short one."],
    ])
  })
})

describe("getCourse", () => {
  it("returns chapters in order with published lessons only", async () => {
    signOut()

    const page = await executeQuery(courseQuery({ locale: "pl-PL", slug: "the-walkthrough" }))

    expect(page.course).toStrictEqual({
      icon: COURSE_ICON.BOOK_OPEN,
      id: IDS.COURSE,
      kind: COURSE_KIND.COURSE,
      level: COURSE_LEVEL.BEGINNER,
      outcomes: [],
      prerequisites: [],
      slug: "the-walkthrough",
      summary: "Jak to działa.",
      title: "Przewodnik",
    })
    expect(page.chapters.map(({ lessons, title }) => [title, lessons.map(({ slug }) => slug)])).toStrictEqual([
      ["Pierwszy", ["boundaries", "sessions"]],
      ["Second", ["billing", "coverage"]],
    ])
    expect(page.chapters[0]?.lessons[0]).toMatchObject({ durationMs: 125_000, recording: false, title: "Granice" })
    expect(page.chapters[1]?.lessons[1]).toMatchObject({ durationMs: null, recording: true })
    expect(page.viewer).toStrictEqual({ signedIn: false })
  })

  it("returns the course's level, icon, outcomes, prerequisites and chapter summaries in the visitor's language", async () => {
    signOut()
    await db
      .update(course)
      .set({
        icon: COURSE_ICON.ROCKET,
        level: COURSE_LEVEL.ADVANCED,
        outcomes: { "en-US": ["Ship it", "Sell it"], "pl-PL": ["Wdróż"] },
        prerequisites: { "en-US": ["TypeScript"] },
      })
      .where(eq(course.id, IDS.COURSE))
    await db
      .update(chapter)
      .set({ summary: { "en-US": "The basics.", "pl-PL": "Podstawy." } })
      .where(eq(chapter.id, IDS.CHAPTER_ONE))

    const page = await executeQuery(courseQuery({ locale: "pl-PL", slug: "the-walkthrough" }))

    expect(page.course).toMatchObject({
      icon: COURSE_ICON.ROCKET,
      level: COURSE_LEVEL.ADVANCED,
      outcomes: ["Wdróż"],
      prerequisites: ["TypeScript"],
    })
    expect(page.chapters.map(({ summary }) => summary)).toStrictEqual(["Podstawy.", ""])
  })

  it("lists a lesson on the placeholder video as being recorded, with no length", async () => {
    signOut()
    await playLessonOn(LESSON_IDS.PREVIEW, IDS.PLACEHOLDER_VIDEO)

    const page = await executeQuery(courseQuery({ locale: "en-US", slug: "the-walkthrough" }))

    expect(page.chapters[0]?.lessons[0]).toMatchObject({ durationMs: null, locked: false, recording: true, slug: "boundaries" })
  })

  it.each([
    { expected: { billing: true, boundaries: false, coverage: true, sessions: true }, name: "a visitor", user: undefined },
    {
      expected: { billing: true, boundaries: false, coverage: true, sessions: false },
      name: "an account without course access",
      user: USERS.VISITOR,
    },
    {
      expected: { billing: false, boundaries: false, coverage: false, sessions: false },
      name: "an account an area grants course access",
      user: USERS.ENTITLED,
    },
  ])("locks lessons for $name", async ({ expected, user }) => {
    if (user === undefined) {
      signOut()
    } else {
      signIn(user)
    }

    expect(await lockedBySlug()).toStrictEqual(expected)
  })

  it("unlocks everything for staff", async () => {
    signIn(USERS.VISITOR, ROLE_CODES.ADMIN)

    expect(Object.values(await lockedBySlug())).toStrictEqual([false, false, false, false])
  })

  it("returns the viewer's own progress", async () => {
    signIn(USERS.ENTITLED)
    await recordProgress({ completedAt: new Date(), lessonId: LESSON_IDS.PREVIEW, positionMs: 0, userId: USERS.ENTITLED })
    await recordProgress({ lessonId: LESSON_IDS.ACCOUNT, positionMs: 42_000, userId: USERS.ENTITLED })
    await recordProgress({ completedAt: new Date(), lessonId: LESSON_IDS.PAID, positionMs: 0, userId: USERS.VISITOR })

    const page = await executeQuery(courseQuery({ locale: "en-US", slug: "the-walkthrough" }))
    const lessons = page.chapters.flatMap((entry) => entry.lessons)

    expect(lessons.map(({ completed, positionMs, slug }) => [slug, completed, positionMs])).toStrictEqual([
      ["boundaries", true, 0],
      ["sessions", false, 42_000],
      ["billing", false, 0],
      ["coverage", false, 0],
    ])
    expect(page.viewer).toStrictEqual({ signedIn: true })
  })

  it.each(["unreleased", "missing"])("reports %s as not found", async (slug) => {
    signOut()

    await expect(executeQuery(courseQuery({ locale: "en-US", slug }))).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("lists a course without chapters and a chapter without published lessons", async () => {
    signOut()

    const empty = await executeQuery(courseQuery({ locale: "en-US", slug: "one-off" }))
    await db.insert(chapter).values({ courseId: IDS.TUTORIAL, id: "01960000-0000-7000-8000-00000000c199", title: { "en-US": "Soon" } })
    const upcoming = await executeQuery(courseQuery({ locale: "en-US", slug: "one-off" }))

    expect(empty.chapters).toStrictEqual([])
    expect(upcoming.chapters).toStrictEqual([{ id: "01960000-0000-7000-8000-00000000c199", lessons: [], summary: "", title: "Soon" }])
  })
})
