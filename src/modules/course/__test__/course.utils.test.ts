import { describe, expect, it } from "vite-plus/test"

import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL, COURSE_STATUS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { courseLessons, findEditorLesson, locateLesson, nextLessonToWatch } from "~/src/modules/course/course.utils"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"

const lesson = (slug: string, overrides: Partial<Course["pageLesson"]> = {}): Course["pageLesson"] => ({
  access: LESSON_ACCESS.PREVIEW,
  chapterId: "chapter",
  completed: false,
  durationMs: 1000,
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
          icon: COURSE_ICON.BOOK_OPEN,
          id: "c",
          kind: COURSE_KIND.COURSE,
          level: COURSE_LEVEL.BEGINNER,
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

const editorLesson = (id: string): Course["editorLesson"] => ({
  access: LESSON_ACCESS.PAID,
  attachments: [],
  chapterId: "chapter",
  description: {},
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
