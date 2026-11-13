import { describe, expect, it } from "vite-plus/test"

import { COURSE_KIND } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { courseLessons, locateLesson, nextLessonToWatch } from "~/src/modules/course/course.utils"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

const lesson = (slug: string, overrides: Partial<Course["pageLesson"]> = {}): Course["pageLesson"] => ({
  access: LESSON_ACCESS.PREVIEW,
  chapterId: "chapter",
  completed: false,
  durationMs: 1000,
  id: slug,
  locked: false,
  positionMs: 0,
  slug,
  summary: "",
  title: slug,
  ...overrides,
})

describe("course utils", () => {
  it("flattens chapters in order", () => {
    const page = {
      chapters: [
        { id: "one", lessons: [lesson("a"), lesson("b")], title: "One" },
        { id: "two", lessons: [lesson("c")], title: "Two" },
      ],
    } satisfies Pick<Course["page"], "chapters">

    expect(
      courseLessons({
        ...page,
        course: { id: "c", kind: COURSE_KIND.COURSE, slug: "c", summary: "", title: "" },
        viewer: { licensed: false, signedIn: false },
      }).map(({ slug }) => slug),
    ).toStrictEqual(["a", "b", "c"])
  })

  it("continues with the first unlocked lesson that is not completed", () => {
    expect(nextLessonToWatch([lesson("a", { completed: true }), lesson("b", { locked: true }), lesson("c")])?.slug).toBe("c")
  })

  it("restarts from the first unlocked lesson when every one is completed", () => {
    expect(nextLessonToWatch([lesson("a", { locked: true }), lesson("b", { completed: true })])?.slug).toBe("b")
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
