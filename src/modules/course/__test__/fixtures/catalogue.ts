import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { chapter } from "~/src/modules/chapter/chapter.schema"
import { COURSE_KIND, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { user } from "~/src/modules/user/user.schema"
import { video } from "~/src/modules/video/video.schema"

export const IDS = {
  CHAPTER_ONE: "01960000-0000-7000-8000-00000000c101",
  CHAPTER_TWO: "01960000-0000-7000-8000-00000000c102",
  COURSE: "01960000-0000-7000-8000-00000000c001",
  DRAFT_COURSE: "01960000-0000-7000-8000-00000000c002",
  TUTORIAL: "01960000-0000-7000-8000-00000000c003",
  VIDEO: "01960000-0000-7000-8000-00000000f001",
} as const

export const LESSON_IDS = {
  ACCOUNT: "01960000-0000-7000-8000-00000000a002",
  DRAFT: "01960000-0000-7000-8000-00000000a005",
  PAID: "01960000-0000-7000-8000-00000000a003",
  PAID_WITHOUT_VIDEO: "01960000-0000-7000-8000-00000000a004",
  PREVIEW: "01960000-0000-7000-8000-00000000a001",
} as const

export const USERS = {
  BUYER: "01960000-0000-7000-8000-0000000b0001",
  CORE_BUYER: "01960000-0000-7000-8000-0000000b0002",
  REFUNDED: "01960000-0000-7000-8000-0000000b0003",
  VISITOR: "01960000-0000-7000-8000-0000000b0004",
} as const

const DURATION_MS = 125_000

export const seedCatalogue = async (): Promise<void> => {
  await db.delete(course)
  await db.delete(video)
  await db.delete(license)
  await db.delete(user)

  await db.insert(user).values(Object.values(USERS).map((id) => ({ email: `${id}@example.test`, id, name: "Learner" })))
  await db.insert(license).values([
    { id: "licence-buyer", polarCustomerId: "customer", status: LICENSE_STATUS.ACTIVE, tier: LICENSE_TIER.COMPLETE, userId: USERS.BUYER },
    { id: "licence-core", polarCustomerId: "customer", status: LICENSE_STATUS.ACTIVE, tier: LICENSE_TIER.CORE, userId: USERS.CORE_BUYER },
    {
      id: "licence-refunded",
      polarCustomerId: "customer",
      status: LICENSE_STATUS.REVOKED,
      tier: LICENSE_TIER.AGENCY,
      userId: USERS.REFUNDED,
    },
  ])
  await db
    .insert(video)
    .values({ captionLocales: ["en-US"], durationMs: DURATION_MS, height: 1080, id: IDS.VIDEO, sizeBytes: 1, title: "Lesson", width: 1920 })
  await db.insert(course).values([
    {
      id: IDS.COURSE,
      position: 1,
      slug: "the-walkthrough",
      status: COURSE_STATUS.PUBLISHED,
      summary: { "en-US": "How it works.", "pl-PL": "Jak to działa." },
      title: { "en-US": "The walkthrough", "pl-PL": "Przewodnik" },
    },
    { id: IDS.DRAFT_COURSE, slug: "unreleased", summary: { "en-US": "Soon." }, title: { "en-US": "Unreleased" } },
    {
      id: IDS.TUTORIAL,
      kind: COURSE_KIND.TUTORIAL,
      position: 2,
      slug: "one-off",
      status: COURSE_STATUS.PUBLISHED,
      summary: { "en-US": "A short one." },
      title: { "en-US": "One-off tutorial" },
    },
  ])
  await db.insert(chapter).values([
    { courseId: IDS.COURSE, id: IDS.CHAPTER_TWO, position: 2, title: { "en-US": "Second" } },
    { courseId: IDS.COURSE, id: IDS.CHAPTER_ONE, position: 1, title: { "en-US": "First", "pl-PL": "Pierwszy" } },
  ])
  await db.insert(lesson).values([
    {
      access: LESSON_ACCESS.PREVIEW,
      chapterId: IDS.CHAPTER_ONE,
      courseId: IDS.COURSE,
      id: LESSON_IDS.PREVIEW,
      position: 1,
      slug: "boundaries",
      status: LESSON_STATUS.PUBLISHED,
      summary: { "en-US": "Start here." },
      title: { "en-US": "Boundaries", "pl-PL": "Granice" },
      videoId: IDS.VIDEO,
    },
    {
      access: LESSON_ACCESS.ACCOUNT,
      chapterId: IDS.CHAPTER_ONE,
      courseId: IDS.COURSE,
      id: LESSON_IDS.ACCOUNT,
      position: 2,
      slug: "sessions",
      status: LESSON_STATUS.PUBLISHED,
      summary: { "en-US": "Sessions." },
      title: { "en-US": "Sessions" },
      videoId: IDS.VIDEO,
    },
    {
      access: LESSON_ACCESS.PAID,
      chapterId: IDS.CHAPTER_TWO,
      courseId: IDS.COURSE,
      id: LESSON_IDS.PAID,
      position: 1,
      slug: "billing",
      status: LESSON_STATUS.PUBLISHED,
      summary: { "en-US": "Billing." },
      title: { "en-US": "Billing" },
      videoId: IDS.VIDEO,
    },
    {
      access: LESSON_ACCESS.PAID,
      chapterId: IDS.CHAPTER_TWO,
      courseId: IDS.COURSE,
      id: LESSON_IDS.PAID_WITHOUT_VIDEO,
      position: 2,
      slug: "coverage",
      status: LESSON_STATUS.PUBLISHED,
      summary: { "en-US": "Coverage." },
      title: { "en-US": "Coverage" },
    },
    {
      chapterId: IDS.CHAPTER_TWO,
      courseId: IDS.COURSE,
      id: LESSON_IDS.DRAFT,
      position: 3,
      slug: "unfinished",
      summary: { "en-US": "Not yet." },
      title: { "en-US": "Unfinished" },
      videoId: IDS.VIDEO,
    },
  ])
}

export const recordProgress = (values: { completedAt?: Date; lessonId: string; positionMs: number; userId: string }) =>
  db.insert(lessonProgress).values(values)
