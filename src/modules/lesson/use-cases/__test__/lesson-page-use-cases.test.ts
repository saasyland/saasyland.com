import { env } from "cloudflare:workers"

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

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  IDS,
  LESSON_IDS,
  USERS,
  makeTextLesson,
  playLessonOn,
  seedCatalogue,
  takeVideoOff,
} from "~/src/modules/course/__test__/fixtures/catalogue"
import {
  LESSON_ATTACHMENT_FILE_TYPES,
  LESSON_ATTACHMENT_KIND,
  LESSON_ATTACHMENT_PATH_PREFIX,
} from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { serveAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.delivery"
import { attachmentObjectKey } from "~/src/modules/lesson-attachment/lesson-attachment.files"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import { LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { lessonQuery } from "~/src/modules/lesson/use-cases/get-lesson"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"

vi.mock("~/src/data/course-access.entries", () => import("~/src/modules/course/__test__/fixtures/course-access"))

const COURSE_SLUG = "the-walkthrough"
const FILE_CONTENT = "%PDF-1.7"
const LESSON_SLUGS = { ACCOUNT: "sessions", PAID: "billing", PREVIEW: "boundaries" } as const

const signIn = (userId: string, role: string = ROLE_CODES.CUSTOMER): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId }))
}

const signOut = (): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())
}

const page = (lessonSlug: string, locale: "en-US" | "pl-PL" = "en-US") =>
  executeQuery(lessonQuery({ courseSlug: COURSE_SLUG, lessonSlug, locale }))

const MATERIALS = [
  { file: "01960000-0000-7000-8000-00000000d001", lessonId: LESSON_IDS.PREVIEW, link: "01960000-0000-7000-8000-00000000d101" },
  { file: "01960000-0000-7000-8000-00000000d002", lessonId: LESSON_IDS.ACCOUNT, link: "01960000-0000-7000-8000-00000000d102" },
  { file: "01960000-0000-7000-8000-00000000d003", lessonId: LESSON_IDS.PAID, link: "01960000-0000-7000-8000-00000000d103" },
] as const

const [PREVIEW_MATERIALS] = MATERIALS

const seedMaterials = async (): Promise<void> => {
  await db.insert(lessonAttachment).values(
    MATERIALS.flatMap(({ file, lessonId, link }) => [
      {
        contentType: LESSON_ATTACHMENT_FILE_TYPES.pdf,
        id: file,
        kind: LESSON_ATTACHMENT_KIND.FILE,
        lessonId,
        objectKey: attachmentObjectKey({ attachmentId: file, fileName: "slides.pdf" }),
        position: 1,
        sizeBytes: FILE_CONTENT.length,
        title: { "en-US": "Slides", "pl-PL": "Slajdy" },
      },
      { id: link, kind: LESSON_ATTACHMENT_KIND.LINK, lessonId, position: 2, title: { "en-US": "Docs" }, url: "/docs/features/courses" },
    ]),
  )
  await Promise.all(
    MATERIALS.map(({ file }) => env.MEDIA.put(attachmentObjectKey({ attachmentId: file, fileName: "slides.pdf" }), FILE_CONTENT)),
  )
}

const hrefsOf = async (lessonSlug: string) => {
  const { lesson: detail } = await page(lessonSlug)
  return detail.attachments.map(({ href }) => href)
}

beforeEach(async () => {
  await seedCatalogue()
  await seedMaterials()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getLesson", () => {
  it("returns the course outline, the lesson with its text and its neighbours", async () => {
    signOut()
    await db
      .update(lesson)
      .set({
        description: { "en-US": "Start with `README.md`.", "pl-PL": "Zacznij od `README.md`." },
        keyMoments: [
          { label: { "en-US": "Install" }, seconds: 5 },
          { label: { "en-US": "Run", "pl-PL": "Uruchom" }, seconds: 42 },
        ],
      })
      .where(eq(lesson.id, LESSON_IDS.ACCOUNT))

    const data = await page(LESSON_SLUGS.ACCOUNT, "pl-PL")

    expect(data.course).toMatchObject({ slug: COURSE_SLUG, title: "Przewodnik" })
    expect(data.chapters.map(({ lessons }) => lessons.map(({ slug }) => slug))).toStrictEqual([
      ["boundaries", "sessions"],
      ["billing", "coverage"],
    ])
    expect(data.lesson).toMatchObject({
      captionLocales: ["en-US"],
      description: "Zacznij od `README.md`.",
      id: LESSON_IDS.ACCOUNT,
      keyMoments: [
        { label: "Install", seconds: 5 },
        { label: "Uruchom", seconds: 42 },
      ],
      locked: true,
      recording: false,
      slug: LESSON_SLUGS.ACCOUNT,
    })
    expect(data.previous?.slug).toBe("boundaries")
    expect(data.next?.slug).toBe("billing")
    expect(data.viewer).toStrictEqual({ mustConfirmEmail: false, signedIn: false })
  })

  it("lists the materials in order with their titles, kinds and sizes", async () => {
    signOut()

    const { lesson: detail } = await page(LESSON_SLUGS.PREVIEW, "pl-PL")
    const [file] = detail.attachments

    expect(file?.href).toMatch(
      new RegExp(`^${LESSON_ATTACHMENT_PATH_PREFIX}/[\\da-z]+\\.[\\da-f]{64}/${PREVIEW_MATERIALS.file}/slides\\.pdf$`, "u"),
    )
    expect(detail.attachments).toStrictEqual([
      {
        contentType: LESSON_ATTACHMENT_FILE_TYPES.pdf,
        fileName: "slides.pdf",
        href: file?.href,
        id: PREVIEW_MATERIALS.file,
        kind: LESSON_ATTACHMENT_KIND.FILE,
        sizeBytes: FILE_CONTENT.length,
        title: "Slajdy",
      },
      { href: "/docs/features/courses", id: PREVIEW_MATERIALS.link, kind: LESSON_ATTACHMENT_KIND.LINK, title: "Docs" },
    ])
  })

  it.each([
    { name: "a guest", opens: [LESSON_SLUGS.PREVIEW], user: undefined },
    { name: "an account without course access", opens: [LESSON_SLUGS.PREVIEW, LESSON_SLUGS.ACCOUNT], user: USERS.VISITOR },
    { name: "a licence holder", opens: Object.values(LESSON_SLUGS), user: USERS.ENTITLED },
  ])("gives $name the materials of exactly the lessons they may open", async ({ opens, user }) => {
    if (user === undefined) {
      signOut()
    } else {
      signIn(user)
    }

    for (const slug of Object.values(LESSON_SLUGS)) {
      const allowed = opens.some((open) => open === slug)
      const hrefs = await hrefsOf(slug)
      expect(hrefs.map((href) => href !== undefined)).toStrictEqual([allowed, allowed])
    }
  })

  it("gives staff the materials of every lesson", async () => {
    signIn(USERS.VISITOR, ROLE_CODES.ADMIN)

    expect(await hrefsOf(LESSON_SLUGS.PAID)).not.toContain(undefined)
  })

  it("signs a download that the Worker serves", async () => {
    signIn(USERS.ENTITLED)
    const { lesson: detail } = await page(LESSON_SLUGS.PAID)
    const [file] = detail.attachments

    const response = await serveAttachment(new Request(`https://saasyland.test${file?.href ?? ""}`))

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(await response.text()).toBe(FILE_CONTENT)
  })

  it("shows a text lesson as ready, with no length and no stream", async () => {
    signOut()
    await makeTextLesson(LESSON_IDS.PREVIEW)

    const text = await page(LESSON_SLUGS.PREVIEW)

    expect(text.lesson).toMatchObject({ captionLocales: [], durationMs: null, format: LESSON_FORMAT.TEXT, locked: false, recording: false })
    await expect(executeQuery(lessonPlaybackQuery({ courseSlug: COURSE_SLUG, lessonSlug: LESSON_SLUGS.PREVIEW }))).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )
  })

  it("shows a lesson without a video as being recorded until a video is attached", async () => {
    signOut()
    await takeVideoOff(LESSON_IDS.PREVIEW)

    const recording = await page(LESSON_SLUGS.PREVIEW)

    expect(recording.lesson).toMatchObject({ captionLocales: [], durationMs: null, recording: true })
    await expect(executeQuery(lessonPlaybackQuery({ courseSlug: COURSE_SLUG, lessonSlug: LESSON_SLUGS.PREVIEW }))).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )

    await playLessonOn(LESSON_IDS.PREVIEW, IDS.VIDEO)

    const replaced = await page(LESSON_SLUGS.PREVIEW)

    expect(replaced.lesson).toMatchObject({ captionLocales: ["en-US"], durationMs: 125_000, recording: false })
    await expect(executeQuery(lessonPlaybackQuery({ courseSlug: COURSE_SLUG, lessonSlug: LESSON_SLUGS.PREVIEW }))).resolves.toHaveProperty(
      "src",
    )
  })

  it("shows a lesson without a video as being recorded", async () => {
    signIn(USERS.ENTITLED)

    const coverage = await page("coverage")

    expect(coverage.lesson).toMatchObject({ durationMs: null, recording: true })
  })

  it.each([
    { courseSlug: COURSE_SLUG, lessonSlug: "unfinished", name: "an unpublished lesson" },
    { courseSlug: COURSE_SLUG, lessonSlug: "missing", name: "a missing lesson" },
    { courseSlug: "unreleased", lessonSlug: "boundaries", name: "a lesson of an unpublished course" },
    { courseSlug: "missing", lessonSlug: "boundaries", name: "a missing course" },
  ])("reports $name as not found", async ({ courseSlug, lessonSlug }) => {
    signIn(USERS.VISITOR, ROLE_CODES.ADMIN)

    await expect(executeQuery(lessonQuery({ courseSlug, lessonSlug, locale: "en-US" }))).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})
