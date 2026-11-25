import { describe, expect, it, vi } from "vite-plus/test"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import {
  COURSE_ICON,
  COURSE_KIND,
  COURSE_LEVEL,
  COURSE_MODE,
  COURSE_OFFER_CATEGORY,
  COURSE_STATUS,
} from "~/src/modules/course/course.constants"
import { COURSE_COVER_STORED_TYPES } from "~/src/modules/course/course.cover"
import type { Course } from "~/src/modules/course/course.types"
import {
  catalogueStructuredDataHtml,
  courseLessons,
  courseShareImage,
  courseStructuredDataHtml,
  findEditorLesson,
  isAvailable,
  isOpenToVisitors,
  isPlayable,
  locateLesson,
  nextLessonToWatch,
} from "~/src/modules/course/course.utils"
import { LESSON_ACCESS, LESSON_FORMAT, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"

import { APP_NAME, APP_URL } from "~/src/presentation/branding"

vi.mock(import("~/src/modules/lesson/lesson.access"), async (importOriginal) => {
  const { withTestCourseAccess } = await import("~/src/modules/course/__test__/fixtures/course-access")

  return withTestCourseAccess(importOriginal)
})

const lesson = (slug: string, overrides: Partial<Course["pageLesson"]> = {}): Course["pageLesson"] => ({
  access: LESSON_ACCESS.PREVIEW,
  captioned: false,
  chapterId: "chapter",
  completed: false,
  durationMs: 1000,
  format: LESSON_FORMAT.VIDEO,
  id: slug,
  locked: false,
  positionMs: 0,
  recording: false,
  slug,
  summary: "",
  title: slug,
  ...overrides,
})

describe("course utils", () => {
  it("flattens chapters in order", () => {
    const page = {
      chapters: [
        { id: "one", lessons: [lesson("a"), lesson("b")], summary: "", title: "One" },
        { id: "two", lessons: [lesson("c")], summary: "", title: "Two" },
      ],
    } satisfies Pick<Course["page"], "chapters">

    expect(
      courseLessons({
        ...page,
        course: {
          cover: null,
          icon: COURSE_ICON.BOOK_OPEN,
          id: "c",
          kind: COURSE_KIND.COURSE,
          level: COURSE_LEVEL.BEGINNER,
          materials: 0,
          outcomes: [],
          prerequisites: [],
          slug: "c",
          summary: "",
          title: "",
        },
        viewer: { mustConfirmEmail: false, signedIn: false },
      }).map(({ slug }) => slug),
    ).toStrictEqual(["a", "b", "c"])
  })

  it("continues with the first unlocked lesson that is not completed", () => {
    expect(nextLessonToWatch([lesson("a", { completed: true }), lesson("b", { locked: true }), lesson("c")])?.slug).toBe("c")
  })

  it("restarts from the first unlocked lesson when every one is completed", () => {
    expect(nextLessonToWatch([lesson("a", { locked: true }), lesson("b", { completed: true })])?.slug).toBe("b")
  })

  it("skips lessons that are being recorded", () => {
    expect(nextLessonToWatch([lesson("a", { durationMs: null, recording: true }), lesson("b")])?.slug).toBe("b")
    expect(nextLessonToWatch([lesson("a", { durationMs: null, recording: true })])).toBeUndefined()
  })

  it("offers a text lesson as the next one to take", () => {
    const text = lesson("a", { durationMs: null, format: LESSON_FORMAT.TEXT })

    expect(nextLessonToWatch([lesson("b", { locked: true }), text])?.slug).toBe("a")
  })

  it("plays only an open video lesson that is not being recorded", () => {
    const text = lesson("a", { durationMs: null, format: LESSON_FORMAT.TEXT })

    expect(isAvailable(text)).toBe(true)
    expect(isPlayable(text)).toBe(false)
    expect(isPlayable(lesson("b"))).toBe(true)
    expect(isPlayable(lesson("c", { locked: true }))).toBe(false)
    expect(isPlayable(lesson("d", { durationMs: null, recording: true }))).toBe(false)
  })

  it("has nothing to watch when every lesson is locked", () => {
    expect(nextLessonToWatch([lesson("a", { locked: true })])).toBeUndefined()
  })

  it("finds a lesson with its neighbours", () => {
    const lessons = [lesson("a"), lesson("b"), lesson("c")]

    expect(locateLesson(lessons, "b")).toStrictEqual({ lesson: lessons[1], next: lessons[2], previous: lessons[0] })
    expect(locateLesson(lessons, "a")).toStrictEqual({ lesson: lessons[0], next: lessons[1], previous: undefined })
    expect(locateLesson(lessons, "missing").lesson).toBeUndefined()
  })
})

const UPDATED_AT = new Date("2026-11-01T12:00:00Z")

const COURSE_ID = "0195a2b4-6c8d-7e9f-8a0b-00000000c0c0"
const COVER_ID = "0195a2b4-6c8d-7e9f-8a0b-00000000c0e1"
const COVER = `covers/${COURSE_ID}/${COVER_ID}.webp`

const editorLesson = (id: string): Course["editorLesson"] => ({
  access: LESSON_ACCESS.PAID,
  attachments: [],
  chapterId: "chapter",
  description: {},
  format: LESSON_FORMAT.VIDEO,
  id,
  keyMoments: [],
  position: 1,
  slug: id,
  status: LESSON_STATUS.DRAFT,
  summary: { "en-US": id },
  title: { "en-US": id },
  video: null,
})

describe("findEditorLesson", () => {
  it("finds a lesson of the course in any chapter", () => {
    const editor: Course["editor"] = {
      chapters: [
        { id: "one", lessons: [editorLesson("a")], position: 1, summary: {}, title: { "en-US": "One" } },
        { id: "two", lessons: [editorLesson("b")], position: 2, summary: {}, title: { "en-US": "Two" } },
      ],
      course: {
        cover: null,
        createdAt: UPDATED_AT,
        icon: COURSE_ICON.ROCKET,
        id: "course",
        kind: COURSE_KIND.COURSE,
        level: COURSE_LEVEL.BEGINNER,
        outcomes: {},
        position: 1,
        prerequisites: {},
        slug: "course",
        status: COURSE_STATUS.DRAFT,
        summary: { "en-US": "Course" },
        title: { "en-US": "Course" },
        updatedAt: UPDATED_AT,
      },
    }

    expect(findEditorLesson(editor, "b")?.id).toBe("b")
    expect(findEditorLesson(editor, "missing")).toBeUndefined()
  })
})

describe("courseShareImage", () => {
  it("shares the full-size cover with its type, size and the course title", () => {
    expect(courseShareImage({ cover: COVER, title: "The walkthrough" })).toStrictEqual({
      alt: "The walkthrough",
      height: 900,
      path: `/media/${COVER}`,
      type: COURSE_COVER_STORED_TYPES.webp,
      width: 1600,
    })
  })

  it("leaves the site card to a course without a cover it can describe", () => {
    expect(courseShareImage({ cover: null, title: "The walkthrough" })).toBeUndefined()
    expect(courseShareImage({ cover: `covers/${COURSE_ID}/${COVER_ID}.gif`, title: "The walkthrough" })).toBeUndefined()
  })
})

describe("isOpenToVisitors", () => {
  it("opens to every visitor only a free preview that is not being recorded", () => {
    expect(isOpenToVisitors(lesson("a"))).toBe(true)
    expect(isOpenToVisitors(lesson("b", { recording: true }))).toBe(false)
    expect(isOpenToVisitors(lesson("c", { access: LESSON_ACCESS.ACCOUNT }))).toBe(false)
    expect(isOpenToVisitors(lesson("d", { access: LESSON_ACCESS.PAID }))).toBe(false)
  })
})

const coursePage = (lessons: readonly Course["pageLesson"][], overrides: Partial<Course["page"]["course"]> = {}): Course["page"] => ({
  chapters: [{ id: "one", lessons: [...lessons], summary: "", title: "One" }],
  course: {
    cover: null,
    icon: COURSE_ICON.BOOK_OPEN,
    id: COURSE_ID,
    kind: COURSE_KIND.COURSE,
    level: COURSE_LEVEL.BEGINNER,
    materials: 0,
    outcomes: [],
    prerequisites: [],
    slug: "the-walkthrough",
    summary: "How it works.",
    title: "The walkthrough",
    ...overrides,
  },
  viewer: { mustConfirmEmail: false, signedIn: false },
})

const readCourse = (page: Course["page"]): unknown => {
  const { __html: html } = courseStructuredDataHtml({ level: "Początkujący", locale: "pl-PL", page })

  return JSON.parse(html)
}

describe("courseStructuredDataHtml", () => {
  it("describes a course with free and paid lessons, its cover, what it teaches and its length in its language", () => {
    const page = coursePage([lesson("a", { durationMs: 60_000 }), lesson("b", { access: LESSON_ACCESS.PAID, durationMs: 90_001 })], {
      cover: COVER,
      outcomes: ["Follow a request"],
      prerequisites: ["Node"],
    })
    const url = `${APP_URL}/pl-PL/courses/the-walkthrough`

    expect(readCourse(page)).toStrictEqual({
      "@context": "https://schema.org",
      "@id": `${url}#course`,
      "@type": "Course",
      coursePrerequisites: ["Node"],
      description: "How it works.",
      educationalLevel: "Początkujący",
      hasCourseInstance: [{ "@type": "CourseInstance", courseMode: COURSE_MODE.ONLINE, courseWorkload: "PT3M" }],
      image: `${APP_URL}/media/${COVER}`,
      inLanguage: "pl-PL",
      isAccessibleForFree: false,
      name: "The walkthrough",
      offers: [
        { "@type": "Offer", category: COURSE_OFFER_CATEGORY.PARTIALLY_FREE, price: 100, priceCurrency: CURRENCY_FORMAT.currency, url },
      ],
      provider: { "@type": "Organization", name: APP_NAME, sameAs: APP_URL },
      teaches: ["Follow a request"],
      url,
    })
  })

  it("offers a course whose lessons need no licence for free, without a workload while every lesson is being recorded", () => {
    const page = coursePage([
      lesson("a", { durationMs: null, recording: true }),
      lesson("b", { access: LESSON_ACCESS.ACCOUNT, durationMs: null, recording: true }),
    ])

    expect(readCourse(page)).toMatchObject({
      hasCourseInstance: [{ "@type": "CourseInstance", courseMode: COURSE_MODE.ONLINE }],
      isAccessibleForFree: true,
      offers: [{ category: COURSE_OFFER_CATEGORY.FREE, price: 0 }],
    })
    expect(readCourse(page)).not.toHaveProperty("image")
    expect(readCourse(page)).not.toHaveProperty("teaches")
  })

  it("offers a course of paid lessons at the price of each course access", () => {
    const page = coursePage([lesson("a", { access: LESSON_ACCESS.PAID })])

    expect(readCourse(page)).toMatchObject({
      offers: [{ category: COURSE_OFFER_CATEGORY.PAID, price: 100 }],
    })
  })
})

describe("catalogueStructuredDataHtml", () => {
  it("lists the courses in order with their addresses in the page's language", () => {
    const { __html: html } = catalogueStructuredDataHtml({ courses: [{ slug: "a" }, { slug: "b" }], locale: "de-DE" })

    expect(JSON.parse(html)).toStrictEqual({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: [
        { "@type": "ListItem", position: 1, url: `${APP_URL}/de-DE/courses/a` },
        { "@type": "ListItem", position: 2, url: `${APP_URL}/de-DE/courses/b` },
      ],
    })
  })
})
