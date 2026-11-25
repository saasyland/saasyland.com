import type { ComponentProps } from "react"

import { vi } from "vite-plus/test"

import { COURSE_ACCESS_TEST_NAMES } from "~/src/modules/course/__test__/fixtures/course-access.messages"
import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { courseLessons, locateLesson } from "~/src/modules/course/course.utils"
import type { saveLessonProgressMutation } from "~/src/modules/lesson-progress/use-cases/save-lesson-progress"
import { LESSON_ACCESS, LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import type { sendVerificationEmailMutation } from "~/src/modules/verification/use-cases/send-verification-email"
import type { Video } from "~/src/modules/video/video.types"

import type { VideoPlayer } from "~/src/presentation/components/custom/video-player"

import * as ROUTES from "~/src/routes"

export type PlayerProps = ComponentProps<typeof VideoPlayer>

export const COURSE_SLUG = "the-walkthrough"

export const player = new Map<"props", PlayerProps>()
export const coursePages = new Map<"current", Course["page"]>()
export const materials = new Map<string, Lesson["attachment"][]>()
export const details = new Map<string, Pick<Lesson["detail"], "captionLocales" | "description" | "keyMoments">>()

export const save = vi.fn<NonNullable<typeof saveLessonProgressMutation.mutationFn>>()
export const resendVerification = vi.fn<NonNullable<typeof sendVerificationEmailMutation.mutationFn>>(() => Promise.resolve({ sent: true }))

export const resetCoursePages = (): void => {
  player.clear()
  coursePages.clear()
  materials.clear()
  details.clear()
  save.mockImplementation(({ completed, lessonId }) => Promise.resolve({ completed, lessonId }))
}

export const lessonPageOf = (source: Course["page"], slug: string): Lesson["page"] | undefined => {
  const { lesson: entry, next, previous } = locateLesson(courseLessons(source), slug)
  return (
    entry && {
      ...source,
      lesson: {
        ...entry,
        attachments: materials.get(slug) ?? [],
        captionLocales: [],
        description: "",
        keyMoments: [],
        ...details.get(slug),
      },
      next,
      previous,
    }
  )
}

export const withOffer = (message: string): string => message.replace("{offer}", COURSE_ACCESS_TEST_NAMES.offer)

export const withRedirect = (page: string, path: string): string => `${page}?${new URLSearchParams({ redirect: path }).toString()}`

export const SIGNED_IN_UNLOCK = ROUTES.COURSES

export const SIGNED_OUT_UNLOCK = withRedirect(ROUTES.SIGN_UP, SIGNED_IN_UNLOCK)

export const PLAYBACK: Video["playback"] = {
  captions: [],
  poster: "/media/a.b/v/poster.webp",
  posterSmall: "/media/a.b/v/poster-960.webp",
  src: "/media/a.b/v/master.m3u8",
  storyboard: "/media/a.b/v/storyboard.vtt",
}

export const lesson = (slug: string, title: string, overrides: Partial<Course["pageLesson"]> = {}): Course["pageLesson"] => ({
  access: LESSON_ACCESS.PAID,
  captioned: false,
  chapterId: "chapter",
  completed: false,
  durationMs: 125_000,
  format: LESSON_FORMAT.VIDEO,
  id: `lesson-${slug}`,
  locked: false,
  positionMs: 0,
  recording: overrides.durationMs === null,
  slug,
  summary: `${title} summary.`,
  title,
  ...overrides,
})

export const page = ({
  lessons,
  viewer,
}: {
  readonly lessons: Course["pageLesson"][]
  readonly viewer: Course["page"]["viewer"]
}): Course["page"] => ({
  chapters: [
    { id: "chapter-one", lessons: lessons.slice(0, 2), summary: "", title: "Foundations" },
    { id: "chapter-two", lessons: lessons.slice(2), summary: "", title: "Product" },
  ],
  course: {
    cover: null,
    icon: COURSE_ICON.BOOK_OPEN,
    id: "course",
    kind: COURSE_KIND.COURSE,
    level: COURSE_LEVEL.BEGINNER,
    materials: 0,
    outcomes: [],
    prerequisites: [],
    slug: COURSE_SLUG,
    summary: "How it works.",
    title: "The walkthrough",
  },
  viewer,
})

export const GUEST_PAGE = page({
  lessons: [
    lesson("boundaries", "Boundaries", { access: LESSON_ACCESS.PREVIEW }),
    lesson("sessions", "Sessions", { access: LESSON_ACCESS.ACCOUNT, locked: true }),
    lesson("billing", "Billing", { locked: true }),
    lesson("coverage", "Coverage", { durationMs: null, locked: true }),
  ],
  viewer: { mustConfirmEmail: false, signedIn: false },
})

export const LEARNER_PAGE = page({
  lessons: [
    lesson("boundaries", "Boundaries", { access: LESSON_ACCESS.PREVIEW, completed: true }),
    lesson("sessions", "Sessions", { access: LESSON_ACCESS.ACCOUNT, positionMs: 42_500 }),
    lesson("billing", "Billing"),
    lesson("coverage", "Coverage", { durationMs: null }),
  ],
  viewer: { mustConfirmEmail: false, signedIn: true },
})

export const CUSTOMER_PAGE = page({
  lessons: [
    lesson("boundaries", "Boundaries", { access: LESSON_ACCESS.PREVIEW }),
    lesson("sessions", "Sessions", { access: LESSON_ACCESS.ACCOUNT }),
    lesson("billing", "Billing", { locked: true }),
  ],
  viewer: { mustConfirmEmail: false, signedIn: true },
})

export const completeLesson = (source: Course["page"], slug: string): Course["page"] => ({
  ...source,
  chapters: source.chapters.map((chapter) => ({
    ...chapter,
    lessons: chapter.lessons.map((entry) => ({ ...entry, completed: entry.completed || entry.slug === slug })),
  })),
})

export const WALKTHROUGH_ROW: Course["catalogueCourse"] = {
  completed: 0,
  cover: null,
  durationMs: 375_000,
  icon: COURSE_ICON.BOOK_OPEN,
  id: "course",
  kind: COURSE_KIND.COURSE,
  lessons: 4,
  level: COURSE_LEVEL.BEGINNER,
  paid: 2,
  previews: 1,
  recorded: 3,
  slug: COURSE_SLUG,
  summary: "How it works.",
  title: "The walkthrough",
}

export const COVER_KEY = "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/0195a2b4-6c8d-7e9f-8a0b-0000000c0ve1.webp"

export const TUTORIAL_ROW: Course["catalogueCourse"] = {
  ...WALKTHROUGH_ROW,
  cover: COVER_KEY,
  durationMs: 0,
  id: "tutorial",
  kind: COURSE_KIND.TUTORIAL,
  lessons: 0,
  level: COURSE_LEVEL.ADVANCED,
  paid: 0,
  previews: 0,
  recorded: 0,
  slug: "code-walkthrough",
  summary: "A short one.",
  title: "One-off tutorial",
}

export const CATALOGUE_COURSES = [WALKTHROUGH_ROW, TUTORIAL_ROW]

export const CATALOGUE: Course["catalogue"] = {
  courses: CATALOGUE_COURSES,
  viewer: { mustConfirmEmail: false, signedIn: false, unlocked: false },
}
