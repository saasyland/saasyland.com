import type { DropTarget } from "react-aria-components"

import { FIRST_POSITION } from "~/src/modules/_core/constants/ordering"
import type { Course } from "~/src/modules/course/course.types"

export const CURRICULUM_ROW = {
  CHAPTER: "chapter",
  LESSON: "lesson",
} as const

export const CURRICULUM_DRAG_TYPES = {
  [CURRICULUM_ROW.CHAPTER]: "application/x-saasyland-chapter",
  [CURRICULUM_ROW.LESSON]: "application/x-saasyland-lesson",
} as const

export const DROP_POSITION = {
  AFTER: "after",
  BEFORE: "before",
  ON: "on",
} as const

type RowKind = (typeof CURRICULUM_ROW)[keyof typeof CURRICULUM_ROW]

type DropPosition = (typeof DROP_POSITION)[keyof typeof DROP_POSITION]

type Chapter = Course["editorChapter"]

type Lesson = Course["editorLesson"]

export type CurriculumRow =
  | { readonly chapter: Chapter; readonly id: string; readonly kind: typeof CURRICULUM_ROW.CHAPTER }
  | { readonly id: string; readonly kind: typeof CURRICULUM_ROW.LESSON; readonly lesson: Lesson; readonly number: number }

export interface CurriculumDrop {
  readonly dropPosition: DropPosition
  readonly id: string
}

const NOT_FOUND = -1

export const curriculumRows = (chapters: readonly Chapter[]): CurriculumRow[] =>
  chapters.flatMap((chapter): CurriculumRow[] => [
    { chapter, id: chapter.id, kind: CURRICULUM_ROW.CHAPTER },
    ...chapter.lessons.map((lesson, index): CurriculumRow => ({
      id: lesson.id,
      kind: CURRICULUM_ROW.LESSON,
      lesson,
      number: index + FIRST_POSITION,
    })),
  ])

const gapOf = (rows: readonly CurriculumRow[], { dropPosition, id }: CurriculumDrop): number => {
  const index = rows.findIndex((row) => row.id === id)

  return dropPosition === DROP_POSITION.BEFORE ? index : index + 1
}

export const canDropInCurriculum = (rows: readonly CurriculumRow[], kind: RowKind, target: DropTarget): boolean => {
  if (target.type !== "item" || target.dropPosition === DROP_POSITION.ON) {
    return false
  }

  const gap = gapOf(rows, { dropPosition: target.dropPosition, id: String(target.key) })
  if (kind === CURRICULUM_ROW.LESSON) {
    return gap > 0
  }

  return gap === rows.length || rows[gap]?.kind === CURRICULUM_ROW.CHAPTER
}

type ChapterRow = Extract<CurriculumRow, { kind: typeof CURRICULUM_ROW.CHAPTER }>

type LessonRow = Extract<CurriculumRow, { kind: typeof CURRICULUM_ROW.LESSON }>

const isChapterRow = (row: CurriculumRow): row is ChapterRow => row.kind === CURRICULUM_ROW.CHAPTER

const isLessonRow = (row: CurriculumRow): row is LessonRow => row.kind === CURRICULUM_ROW.LESSON

const regroup = (rows: readonly CurriculumRow[]): Chapter[] => {
  const starts = rows.flatMap((row, index) => (isChapterRow(row) ? [{ chapter: row.chapter, index }] : []))

  return starts.map(({ chapter, index }, order) => {
    const end = starts[order + 1]?.index ?? rows.length
    const lessons = rows
      .slice(index + 1, end)
      .filter((row) => isLessonRow(row))
      .map(({ lesson }, position) => Object.assign(structuredClone(lesson), { chapterId: chapter.id, position: position + FIRST_POSITION }))

    return Object.assign(structuredClone(chapter), { lessons, position: order + FIRST_POSITION })
  })
}

const blockOf = (rows: readonly CurriculumRow[], id: string): CurriculumRow[] => {
  const start = rows.findIndex((row) => row.id === id)
  const moved = rows[start]
  if (moved?.kind !== CURRICULUM_ROW.CHAPTER) {
    return rows.slice(start, start + 1)
  }

  const next = rows.findIndex((row, index) => index > start && isChapterRow(row))
  return rows.slice(start, next === NOT_FOUND ? rows.length : next)
}

export const moveInCurriculum = (
  chapters: readonly Chapter[],
  { drop, moved }: { readonly drop: CurriculumDrop; readonly moved: string },
) => {
  const rows = curriculumRows(chapters)
  const block = blockOf(rows, moved)
  const gap = gapOf(rows, drop)
  const before = rows.slice(0, gap).filter((row) => !block.includes(row))
  const after = rows.slice(gap).filter((row) => !block.includes(row))

  return regroup([...before, ...block, ...after])
}

export const curriculumOrder = (chapters: readonly Chapter[]) =>
  chapters.map((chapter) => ({ chapterId: chapter.id, lessonIds: chapter.lessons.map((lesson) => lesson.id) }))

export const curriculumOrdersMatch = (first: readonly Chapter[], second: readonly Chapter[]): boolean =>
  JSON.stringify(curriculumOrder(first)) === JSON.stringify(curriculumOrder(second))
