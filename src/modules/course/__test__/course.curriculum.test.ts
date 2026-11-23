import { describe, expect, it } from "vite-plus/test"

import {
  CURRICULUM_ROW,
  DROP_POSITION,
  canDropInCurriculum,
  curriculumOrder,
  curriculumOrdersMatch,
  curriculumRows,
  moveInCurriculum,
} from "~/src/modules/course/course.curriculum"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS, LESSON_FORMAT, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"

const lesson = (id: string, chapterId: string, position: number): Course["editorLesson"] => ({
  access: LESSON_ACCESS.PAID,
  attachments: [],
  chapterId,
  description: {},
  format: LESSON_FORMAT.VIDEO,
  id,
  keyMoments: [],
  position,
  slug: id,
  status: LESSON_STATUS.DRAFT,
  summary: { "en-US": id },
  title: { "en-US": id },
  upload: undefined,
  video: null,
})

const chapter = (id: string, position: number, lessonIds: readonly string[]): Course["editorChapter"] => ({
  id,
  lessons: lessonIds.map((lessonId, index) => lesson(lessonId, id, index + 1)),
  position,
  summary: {},
  title: { "en-US": id },
})

const CHAPTERS = [chapter("one", 1, ["a", "b"]), chapter("two", 2, []), chapter("three", 3, ["c"])]

const ROWS = curriculumRows(CHAPTERS)

const orderOf = (chapters: readonly Course["editorChapter"][]) =>
  chapters.map(({ id, lessons, position }) => [
    id,
    position,
    lessons.map((entry) => `${entry.id}:${entry.chapterId}:${String(entry.position)}`),
  ])

describe("curriculum rows", () => {
  it("lists every chapter followed by its lessons", () => {
    expect(ROWS.map(({ id, kind }) => `${kind}:${id}`)).toStrictEqual([
      "chapter:one",
      "lesson:a",
      "lesson:b",
      "chapter:two",
      "chapter:three",
      "lesson:c",
    ])
    expect(curriculumOrder(CHAPTERS)).toStrictEqual([
      { chapterId: "one", lessonIds: ["a", "b"] },
      { chapterId: "two", lessonIds: [] },
      { chapterId: "three", lessonIds: ["c"] },
    ])
  })

  it("tells whether two curricula keep the same order", () => {
    expect(curriculumOrdersMatch(CHAPTERS, structuredClone(CHAPTERS))).toBe(true)
    expect(curriculumOrdersMatch(CHAPTERS, CHAPTERS.toReversed())).toBe(false)
  })

  it("numbers the lessons from one within each chapter, whatever their stored positions", () => {
    const rows = curriculumRows([
      chapter("one", 1, []),
      { ...chapter("two", 2, ["d", "e"]), lessons: [lesson("d", "two", 7), lesson("e", "two", 9)] },
    ])

    expect(rows.flatMap((row) => (row.kind === CURRICULUM_ROW.LESSON ? [`${row.id}:${String(row.number)}`] : []))).toStrictEqual([
      "d:1",
      "e:2",
    ])
  })
})

describe("drops in the curriculum", () => {
  it.each([
    { allowed: true, key: "one", kind: CURRICULUM_ROW.LESSON, position: DROP_POSITION.AFTER },
    { allowed: true, key: "three", kind: CURRICULUM_ROW.LESSON, position: DROP_POSITION.BEFORE },
    { allowed: false, key: "one", kind: CURRICULUM_ROW.LESSON, position: DROP_POSITION.BEFORE },
    { allowed: false, key: "a", kind: CURRICULUM_ROW.LESSON, position: DROP_POSITION.ON },
    { allowed: true, key: "one", kind: CURRICULUM_ROW.CHAPTER, position: DROP_POSITION.BEFORE },
    { allowed: true, key: "b", kind: CURRICULUM_ROW.CHAPTER, position: DROP_POSITION.AFTER },
    { allowed: true, key: "c", kind: CURRICULUM_ROW.CHAPTER, position: DROP_POSITION.AFTER },
    { allowed: false, key: "a", kind: CURRICULUM_ROW.CHAPTER, position: DROP_POSITION.AFTER },
    { allowed: false, key: "three", kind: CURRICULUM_ROW.CHAPTER, position: DROP_POSITION.AFTER },
  ])("allows a $kind $position $key: $allowed", ({ allowed, key, kind, position }) => {
    expect(canDropInCurriculum(ROWS, kind, { dropPosition: position, key, type: "item" })).toBe(allowed)
  })

  it("refuses a drop on the list itself", () => {
    expect(canDropInCurriculum(ROWS, CURRICULUM_ROW.LESSON, { type: "root" })).toBe(false)
  })
})

describe("moves in the curriculum", () => {
  it("moves a lesson within its chapter", () => {
    expect(orderOf(moveInCurriculum(CHAPTERS, { drop: { dropPosition: DROP_POSITION.BEFORE, id: "a" }, moved: "b" }))).toStrictEqual([
      ["one", 1, ["b:one:1", "a:one:2"]],
      ["two", 2, []],
      ["three", 3, ["c:three:1"]],
    ])
  })

  it("moves a lesson into an empty chapter and to the end of the last one", () => {
    expect(orderOf(moveInCurriculum(CHAPTERS, { drop: { dropPosition: DROP_POSITION.AFTER, id: "two" }, moved: "a" }))).toStrictEqual([
      ["one", 1, ["b:one:1"]],
      ["two", 2, ["a:two:1"]],
      ["three", 3, ["c:three:1"]],
    ])
    expect(orderOf(moveInCurriculum(CHAPTERS, { drop: { dropPosition: DROP_POSITION.AFTER, id: "c" }, moved: "b" }))).toStrictEqual([
      ["one", 1, ["a:one:1"]],
      ["two", 2, []],
      ["three", 3, ["c:three:1", "b:three:2"]],
    ])
  })

  it("moves a chapter with its lessons", () => {
    expect(orderOf(moveInCurriculum(CHAPTERS, { drop: { dropPosition: DROP_POSITION.AFTER, id: "c" }, moved: "one" }))).toStrictEqual([
      ["two", 1, []],
      ["three", 2, ["c:three:1"]],
      ["one", 3, ["a:one:1", "b:one:2"]],
    ])
    expect(orderOf(moveInCurriculum(CHAPTERS, { drop: { dropPosition: DROP_POSITION.BEFORE, id: "one" }, moved: "three" }))).toStrictEqual([
      ["three", 1, ["c:three:1"]],
      ["one", 2, ["a:one:1", "b:one:2"]],
      ["two", 3, []],
    ])
  })
})
