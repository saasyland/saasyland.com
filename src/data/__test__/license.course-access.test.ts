import { getRequest } from "@tanstack/react-start/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation, executeQuery } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LESSON_IDS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { courseQuery } from "~/src/modules/course/use-cases/get-course"
import { courseShowcaseQuery } from "~/src/modules/course/use-cases/get-course-showcase"
import { saveLessonProgressMutation } from "~/src/modules/lesson-progress/use-cases/save-lesson-progress"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"
import { LICENSE_STATUS, LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { user } from "~/src/modules/user/user.schema"

import { COURSE_ACCESS_GRANTS } from "~/src/data/course-access"
import { LICENSE_COURSE_ACCESS } from "~/src/data/license.course-access"
import { TIER_PRICES } from "~/src/data/marketing"

import { ROUTES } from "~/src/routes"

const COURSE_SLUG = "the-walkthrough"

const LESSONS = [
  { id: LESSON_IDS.PREVIEW, slug: "boundaries" },
  { id: LESSON_IDS.ACCOUNT, slug: "sessions" },
  { id: LESSON_IDS.PAID, slug: "billing" },
  { id: LESSON_IDS.PAID_WITHOUT_VIDEO, slug: "coverage" },
] as const

const LICENCES = LICENSE_TIERS.flatMap((tier) =>
  Object.values(LICENSE_STATUS).map((status) => ({ status, tier, userId: `learner-${tier}-${status}` })),
)

const VIEWERS = [
  { name: "guest", role: ROLE_CODES.CUSTOMER, userId: undefined },
  { name: "account", role: ROLE_CODES.CUSTOMER, userId: "learner-account" },
  ...LICENCES.map(({ status, tier, userId }) => ({ name: `${tier} ${status}`, role: ROLE_CODES.CUSTOMER, userId })),
  { name: "staff", role: ROLE_CODES.ADMIN, userId: "learner-staff" },
]

const outcome = (run: () => Promise<unknown>): Promise<string> => run().then(() => "allowed", String)

const viewAs = ({ role, userId }: (typeof VIEWERS)[number]): void => {
  vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/"))
  vi.spyOn(auth.api, "getSession").mockResolvedValue(
    userId === undefined ? createMissingAuthSessionResult() : createAuthSessionFixture({ role, userId }),
  )
}

const decisions = async (viewer: (typeof VIEWERS)[number]): Promise<Record<string, string>> => {
  viewAs(viewer)
  const page = await executeQuery(courseQuery({ locale: "en-US", slug: COURSE_SLUG }))
  const locked = new Map(page.chapters.flatMap(({ lessons }) => lessons).map((lesson) => [lesson.slug, lesson.locked]))
  const entries: [string, string][] = []

  for (const lesson of LESSONS) {
    const playback = await outcome(() => executeQuery(lessonPlaybackQuery({ courseSlug: COURSE_SLUG, lessonSlug: lesson.slug })))
    const progress = await outcome(() =>
      executeMutation(saveLessonProgressMutation, { completed: false, lessonId: lesson.id, positionMs: 0 }),
    )
    entries.push([lesson.slug, `locked: ${String(locked.get(lesson.slug))}, playback: ${playback}, progress: ${progress}`])
  }

  return Object.fromEntries(entries)
}

beforeEach(async () => {
  await seedCatalogue()
  await db.delete(license)
  await db
    .insert(user)
    .values(
      VIEWERS.flatMap(({ userId }) => (userId === undefined ? [] : [{ email: `${userId}@example.test`, id: userId, name: "Learner" }])),
    )
  await db
    .insert(license)
    .values(LICENCES.map(({ status, tier, userId }) => ({ id: `licence-${userId}`, polarCustomerId: "customer", status, tier, userId })))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("course access through a licence", () => {
  it("joins the licence to the ways of unlocking paid lessons", () => {
    expect(COURSE_ACCESS_GRANTS).toStrictEqual(LICENSE_COURSE_ACCESS)
  })

  it("offers Complete at its price on the licence page, coming back to the lesson afterwards", () => {
    const lesson = "/courses/the-walkthrough/billing"

    expect(LICENSE_COURSE_ACCESS.map(({ price, unlock }) => ({ price, unlock: unlock(lesson) }))).toStrictEqual([
      {
        price: TIER_PRICES[LICENSE_TIER.COMPLETE],
        unlock: { search: { redirect: lesson, tier: LICENSE_TIER.COMPLETE }, to: ROUTES.APP_LICENSE },
      },
    ])
  })

  it("keeps paid lessons locked for a Complete holder until they confirm their email, on the course page, the catalogue and the landing page", async () => {
    const userId = `learner-${LICENSE_TIER.COMPLETE}-${LICENSE_STATUS.ACTIVE}`
    const holder = createAuthSessionFixture({ userId })
    vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/"))
    vi.spyOn(auth.api, "getSession").mockResolvedValue({ ...holder, user: { ...holder.user, emailVerified: false } })

    const page = await executeQuery(courseQuery({ locale: "en-US", slug: COURSE_SLUG }))

    expect(page.viewer).toStrictEqual({ mustConfirmEmail: true, signedIn: true })
    expect(page.chapters.flatMap(({ lessons }) => lessons).find(({ slug }) => slug === "billing")?.locked).toBe(true)
    await expect(executeQuery(lessonPlaybackQuery({ courseSlug: COURSE_SLUG, lessonSlug: "billing" }))).rejects.toThrow("FORBIDDEN")

    const catalogue = await executeQuery(catalogueQuery({ locale: "en-US" }))
    expect(catalogue.viewer).toStrictEqual({ mustConfirmEmail: true, signedIn: true, unlocked: false })

    const showcase = await executeQuery(courseShowcaseQuery({ locale: "en-US" }))
    expect(showcase.flatMap(({ lessons }) => lessons).map(({ locked, slug }) => [slug, locked])).toStrictEqual([
      ["boundaries", false],
      ["sessions", false],
      ["billing", true],
      ["coverage", true],
    ])
  })
})

it("decides who watches which lesson for every licence tier and status, a guest, an account and staff", async () => {
  const table: Record<string, Record<string, string>> = {}

  for (const viewer of VIEWERS) {
    table[viewer.name] = await decisions(viewer)
  }

  expect(table).toMatchInlineSnapshot(`
    {
      "account": {
        "billing": "locked: true, playback: AppError: FORBIDDEN, progress: AppError: FORBIDDEN",
        "boundaries": "locked: false, playback: allowed, progress: allowed",
        "coverage": "locked: true, playback: AppError: NOT_FOUND, progress: AppError: FORBIDDEN",
        "sessions": "locked: false, playback: allowed, progress: allowed",
      },
      "agency active": {
        "billing": "locked: false, playback: allowed, progress: allowed",
        "boundaries": "locked: false, playback: allowed, progress: allowed",
        "coverage": "locked: false, playback: AppError: NOT_FOUND, progress: allowed",
        "sessions": "locked: false, playback: allowed, progress: allowed",
      },
      "agency refunded": {
        "billing": "locked: true, playback: AppError: FORBIDDEN, progress: AppError: FORBIDDEN",
        "boundaries": "locked: false, playback: allowed, progress: allowed",
        "coverage": "locked: true, playback: AppError: NOT_FOUND, progress: AppError: FORBIDDEN",
        "sessions": "locked: false, playback: allowed, progress: allowed",
      },
      "agency revoked": {
        "billing": "locked: true, playback: AppError: FORBIDDEN, progress: AppError: FORBIDDEN",
        "boundaries": "locked: false, playback: allowed, progress: allowed",
        "coverage": "locked: true, playback: AppError: NOT_FOUND, progress: AppError: FORBIDDEN",
        "sessions": "locked: false, playback: allowed, progress: allowed",
      },
      "complete active": {
        "billing": "locked: false, playback: allowed, progress: allowed",
        "boundaries": "locked: false, playback: allowed, progress: allowed",
        "coverage": "locked: false, playback: AppError: NOT_FOUND, progress: allowed",
        "sessions": "locked: false, playback: allowed, progress: allowed",
      },
      "complete refunded": {
        "billing": "locked: true, playback: AppError: FORBIDDEN, progress: AppError: FORBIDDEN",
        "boundaries": "locked: false, playback: allowed, progress: allowed",
        "coverage": "locked: true, playback: AppError: NOT_FOUND, progress: AppError: FORBIDDEN",
        "sessions": "locked: false, playback: allowed, progress: allowed",
      },
      "complete revoked": {
        "billing": "locked: true, playback: AppError: FORBIDDEN, progress: AppError: FORBIDDEN",
        "boundaries": "locked: false, playback: allowed, progress: allowed",
        "coverage": "locked: true, playback: AppError: NOT_FOUND, progress: AppError: FORBIDDEN",
        "sessions": "locked: false, playback: allowed, progress: allowed",
      },
      "core active": {
        "billing": "locked: true, playback: AppError: FORBIDDEN, progress: AppError: FORBIDDEN",
        "boundaries": "locked: false, playback: allowed, progress: allowed",
        "coverage": "locked: true, playback: AppError: NOT_FOUND, progress: AppError: FORBIDDEN",
        "sessions": "locked: false, playback: allowed, progress: allowed",
      },
      "core refunded": {
        "billing": "locked: true, playback: AppError: FORBIDDEN, progress: AppError: FORBIDDEN",
        "boundaries": "locked: false, playback: allowed, progress: allowed",
        "coverage": "locked: true, playback: AppError: NOT_FOUND, progress: AppError: FORBIDDEN",
        "sessions": "locked: false, playback: allowed, progress: allowed",
      },
      "core revoked": {
        "billing": "locked: true, playback: AppError: FORBIDDEN, progress: AppError: FORBIDDEN",
        "boundaries": "locked: false, playback: allowed, progress: allowed",
        "coverage": "locked: true, playback: AppError: NOT_FOUND, progress: AppError: FORBIDDEN",
        "sessions": "locked: false, playback: allowed, progress: allowed",
      },
      "guest": {
        "billing": "locked: true, playback: AppError: UNAUTHORIZED, progress: AppError: UNAUTHORIZED",
        "boundaries": "locked: false, playback: allowed, progress: AppError: UNAUTHORIZED",
        "coverage": "locked: true, playback: AppError: NOT_FOUND, progress: AppError: UNAUTHORIZED",
        "sessions": "locked: true, playback: AppError: UNAUTHORIZED, progress: AppError: UNAUTHORIZED",
      },
      "staff": {
        "billing": "locked: false, playback: allowed, progress: allowed",
        "boundaries": "locked: false, playback: allowed, progress: allowed",
        "coverage": "locked: false, playback: AppError: NOT_FOUND, progress: allowed",
        "sessions": "locked: false, playback: allowed, progress: allowed",
      },
    }
  `)
})
