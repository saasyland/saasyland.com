import "@tanstack/react-start/server-only"

import { asc, eq } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import { v7 } from "uuid"
import type * as zod from "zod"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { nextPosition } from "~/src/modules/_core/utils/ordering"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { COURSE_DOCUMENT, COURSE_IMPORT_PROBLEMS_MAX, type CourseDocumentEntity } from "~/src/modules/course/course.constants"
import { coverObjectKeys } from "~/src/modules/course/course.cover"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { removeAttachmentObjects } from "~/src/modules/lesson-attachment/lesson-attachment.objects"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import type { LessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.types"
import { attachmentTarget } from "~/src/modules/lesson-attachment/lesson-attachment.utils"
import { LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { removeUploadObjects } from "~/src/modules/video-upload/video-upload.objects"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import type { VideoUpload } from "~/src/modules/video-upload/video-upload.types"
import { video } from "~/src/modules/video/video.schema"

import { MILLISECONDS_PER_SECOND, formatClock } from "~/src/lib/duration"

type DocumentCourse = Course["document"]["courses"][number]

type DocumentChapter = DocumentCourse["chapters"][number]

type DocumentLesson = DocumentChapter["lessons"][number]

type ExportedLesson = Course["courseDocument"]["courses"][number]["chapters"][number]["lessons"][number]

const readState = async () => {
  const [courses, chapters, lessons, attachments, videos, uploads] = await db.batch([
    db.select().from(course).orderBy(asc(course.position), asc(course.id)),
    db.select().from(chapter).orderBy(asc(chapter.position), asc(chapter.id)),
    db.select().from(lesson).orderBy(asc(lesson.position), asc(lesson.id)),
    db.select().from(lessonAttachment).orderBy(asc(lessonAttachment.position), asc(lessonAttachment.id)),
    db.select({ id: video.id }).from(video),
    db.select().from(videoUpload),
  ])

  return {
    attachmentsByLesson: Map.groupBy(attachments, ({ lessonId }) => lessonId),
    chaptersByCourse: Map.groupBy(chapters, ({ courseId }) => courseId),
    courses,
    lessonsByChapter: Map.groupBy(lessons, ({ chapterId }) => chapterId),
    lessonsByCourse: Map.groupBy(lessons, ({ courseId }) => courseId),
    uploadsByLesson: new Map(uploads.map((upload) => [upload.lessonId, upload])),
    videoIds: new Set(videos.map(({ id }) => id)),
  }
}

type State = Awaited<ReturnType<typeof readState>>

const rowsOf = <Row>(groups: ReadonlyMap<string, Row[]>, key: string): Row[] => groups.get(key) ?? []

const linksOf = (attachments: readonly LessonAttachment["select"][]) =>
  attachments.flatMap((row) => {
    const target = attachmentTarget(row)
    return target.kind === LESSON_ATTACHMENT_KIND.LINK ? [{ row, url: target.url }] : []
  })

const exportedLesson = (state: State, row: Lesson["select"]): ExportedLesson => ({
  access: row.access,
  description: row.description,
  keyMoments: row.keyMoments.map(({ label, seconds }) => ({ at: formatClock(seconds * MILLISECONDS_PER_SECOND), label })),
  links: linksOf(rowsOf(state.attachmentsByLesson, row.id)).map(({ row: link, url }) => ({ title: link.title, url })),
  slug: row.slug,
  status: row.status,
  summary: row.summary,
  title: row.title,
  ...(row.format === LESSON_FORMAT.TEXT ? { format: row.format } : {}),
  ...(row.videoId === null ? {} : { videoId: row.videoId }),
})

export const exportCourseDocument = async (courseId: string | undefined): Promise<Course["courseDocument"]> => {
  const state = await readState()
  const courses = state.courses.filter(({ id }) => courseId === undefined || id === courseId)

  if (courses.length === 0 && courseId !== undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND)
  }

  return {
    courses: courses.map(({ id, icon, kind, level, outcomes, prerequisites, slug, status, summary, title }) => ({
      chapters: rowsOf(state.chaptersByCourse, id).map((row) => ({
        lessons: rowsOf(state.lessonsByChapter, row.id).map((entry) => exportedLesson(state, entry)),
        summary: row.summary,
        title: row.title,
      })),
      icon,
      kind,
      level,
      outcomes,
      prerequisites,
      slug,
      status,
      summary,
      title,
    })),
    format: COURSE_DOCUMENT.FORMAT,
    version: COURSE_DOCUMENT.VERSION,
  }
}

interface DocumentProblem {
  readonly message: string
  readonly path: string
}

const DOCUMENT_INVALID: DocumentProblem = { message: "documentInvalid", path: "" }

const pathOf = (path: readonly PropertyKey[]): string => path.map(String).join(".")

const problemsOf = (issue: zod.core.$ZodIssue): DocumentProblem[] => {
  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((key) => ({ message: "keyUnknown", path: pathOf([...issue.path, key]) }))
  }

  return [{ message: issue.message, path: pathOf(issue.path) }]
}

const courseDocumentOf = (json: unknown) => {
  const result = courseZodSchemas.courseDocument.safeParse(json)
  if (result.success) {
    return { document: result.data }
  }

  const problems = result.error.issues.flatMap((issue) => problemsOf(issue))
  return { problemCount: problems.length, problems: problems.slice(0, COURSE_IMPORT_PROBLEMS_MAX) }
}

export const readCourseDocument = (text: string) => {
  try {
    return courseDocumentOf(JSON.parse(text))
  } catch {
    return { problemCount: 1, problems: [DOCUMENT_INVALID] }
  }
}

interface Tally {
  create: number
  keep: number
  remove: number
  unchanged: number
  update: number
}

type Outcome = keyof Tally

interface Plan {
  readonly objectKeys: string[]
  readonly removals: BatchItem<"sqlite">[]
  readonly removeMissing: boolean
  readonly tallies: Record<CourseDocumentEntity, Tally>
  readonly uploads: VideoUpload["select"][]
  readonly warnings: { course: string; lesson: string; videoId: string }[]
  readonly writes: BatchItem<"sqlite">[]
}

const emptyTally = (): Tally => ({ create: 0, keep: 0, remove: 0, unchanged: 0, update: 0 })

const count = (plan: Plan, entity: CourseDocumentEntity, outcome: Outcome): void => {
  plan.tallies[entity][outcome] += 1
}

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => canonical(entry))
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([first], [second]) => first.localeCompare(second))
        .map(([key, entry]) => [key, canonical(entry)]),
    )
  }

  return value
}

const matches = (current: object, desired: object): boolean => {
  const values = new Map(Object.entries(current))
  return Object.entries(desired).every(([key, value]) => JSON.stringify(canonical(values.get(key))) === JSON.stringify(canonical(value)))
}

interface Update {
  readonly statement: () => BatchItem<"sqlite">
  readonly unchanged: boolean
}

const planUpdate = (plan: Plan, entity: CourseDocumentEntity, { statement, unchanged }: Update): void => {
  if (unchanged) {
    count(plan, entity, "unchanged")
    return
  }

  plan.writes.push(statement())
  count(plan, entity, "update")
}

const planMissing = (plan: Plan, entity: CourseDocumentEntity, statement: () => BatchItem<"sqlite">): boolean => {
  if (!plan.removeMissing) {
    count(plan, entity, "keep")
    return false
  }

  plan.removals.push(statement())
  count(plan, entity, "remove")
  return true
}

const dropLessonFiles = (plan: Plan, state: State, lessonId: string): void => {
  for (const row of rowsOf(state.attachmentsByLesson, lessonId)) {
    const target = attachmentTarget(row)
    if (target.kind === LESSON_ATTACHMENT_KIND.LINK) {
      count(plan, "links", "remove")
    } else {
      plan.objectKeys.push(target.objectKey)
    }
  }

  const upload = state.uploadsByLesson.get(lessonId)
  if (upload !== undefined) {
    plan.uploads.push(upload)
  }
}

const planLinks = (plan: Plan, state: State, { lessonId, links }: { lessonId: string; links: DocumentLesson["links"] }): void => {
  const attachments = rowsOf(state.attachmentsByLesson, lessonId)
  const rows = linksOf(attachments).map(({ row }) => row)
  const firstPosition = nextPosition(attachments) - rows.length

  for (const [index, fields] of links.entries()) {
    const row = rows[index]
    if (row === undefined) {
      plan.writes.push(
        db
          .insert(lessonAttachment)
          .values({ ...fields, id: v7(), kind: LESSON_ATTACHMENT_KIND.LINK, lessonId, position: firstPosition + index }),
      )
      count(plan, "links", "create")
    } else {
      planUpdate(plan, "links", {
        statement: () => db.update(lessonAttachment).set(fields).where(eq(lessonAttachment.id, row.id)),
        unchanged: matches(row, fields),
      })
    }
  }

  for (const row of rows.slice(links.length)) {
    planMissing(plan, "links", () => db.delete(lessonAttachment).where(eq(lessonAttachment.id, row.id)))
  }
}

interface LessonTarget {
  readonly chapterId: string
  readonly courseId: string
  readonly courseSlug: string
  readonly entry: DocumentLesson
  readonly position: number
  readonly row: Lesson["select"] | undefined
}

const resolveVideo = (plan: Plan, state: State, { courseSlug, entry }: LessonTarget): string | undefined => {
  const knownVideoId = [...state.videoIds].find((id) => id === entry.videoId)
  if (entry.videoId !== undefined && knownVideoId === undefined) {
    plan.warnings.push({ course: courseSlug, lesson: entry.slug, videoId: entry.videoId })
  }

  return knownVideoId
}

const lessonContent = ({ access, description, format, keyMoments, slug, status, summary, title }: DocumentLesson) => ({
  access,
  description,
  keyMoments,
  slug,
  status,
  summary,
  title,
  ...(format === undefined ? {} : { format }),
})

const planLesson = (plan: Plan, state: State, target: LessonTarget): void => {
  const { chapterId, courseId, entry, position, row } = target
  const content = lessonContent(entry)
  const videoId = resolveVideo(plan, state, target)
  const fields = { ...content, chapterId, position, ...(videoId === undefined ? {} : { videoId }) }

  if (row === undefined) {
    const id = v7()
    plan.writes.push(db.insert(lesson).values({ ...fields, courseId, id }))
    count(plan, "lessons", "create")
    planLinks(plan, state, { lessonId: id, links: entry.links })
    return
  }

  planUpdate(plan, "lessons", {
    statement: () => db.update(lesson).set(fields).where(eq(lesson.id, row.id)),
    unchanged: matches(row, fields),
  })
  planLinks(plan, state, { lessonId: row.id, links: entry.links })
}

const isIncreasing = (values: readonly number[]): boolean =>
  new Set(values).size === values.length &&
  values.toSorted((first, second) => first - second).every((value, index) => value === values[index])

interface ChapterTarget {
  readonly id: string
  readonly lessons: DocumentChapter["lessons"]
}

interface CourseTarget {
  readonly courseId: string
  readonly courseSlug: string
}

const planChapterLessons = (
  plan: Plan,
  state: State,
  {
    chapterId,
    kept,
    placed,
    ...owner
  }: CourseTarget & { chapterId: string; kept: Lesson["select"][]; placed: { entry: DocumentLesson; row: Lesson["select"] | undefined }[] },
): void => {
  const current = [...placed.map(({ row }) => row), ...kept]
  const positions = current.flatMap((row) => (row?.chapterId === chapterId ? [row.position] : []))
  const inPlace = positions.length === current.length && isIncreasing(positions)

  for (const [index, { entry, row }] of placed.entries()) {
    const position = inPlace && row !== undefined ? row.position : index + 1
    planLesson(plan, state, { ...owner, chapterId, entry, position, row })
  }

  if (!inPlace) {
    for (const [index, row] of kept.entries()) {
      plan.writes.push(
        db
          .update(lesson)
          .set({ position: placed.length + index + 1 })
          .where(eq(lesson.id, row.id)),
      )
    }
  }
}

const planLessons = (plan: Plan, state: State, { chapters, ...owner }: CourseTarget & { chapters: ChapterTarget[] }): void => {
  const rows = rowsOf(state.lessonsByCourse, owner.courseId)
  const bySlug = new Map(rows.map((row) => [row.slug, row]))
  const slugs = new Set(chapters.flatMap(({ lessons }) => lessons.map(({ slug }) => slug)))
  const leftovers = rows.filter(({ slug }) => !slugs.has(slug))

  for (const row of leftovers) {
    if (planMissing(plan, "lessons", () => db.delete(lesson).where(eq(lesson.id, row.id)))) {
      dropLessonFiles(plan, state, row.id)
    }
  }

  for (const { id, lessons } of chapters) {
    const placed = lessons.map((entry) => ({ entry, row: bySlug.get(entry.slug) }))
    const kept = plan.removeMissing ? [] : leftovers.filter(({ chapterId }) => chapterId === id)
    planChapterLessons(plan, state, { ...owner, chapterId: id, kept, placed })
  }
}

const planChapters = (plan: Plan, state: State, { chapters, ...owner }: CourseTarget & { chapters: DocumentCourse["chapters"] }): void => {
  const rows = rowsOf(state.chaptersByCourse, owner.courseId)
  const firstPosition = nextPosition(rows) - rows.length

  const targets = chapters.map(({ lessons, ...fields }, index): ChapterTarget => {
    const row = rows[index]
    if (row === undefined) {
      const id = v7()
      plan.writes.push(db.insert(chapter).values({ ...fields, courseId: owner.courseId, id, position: firstPosition + index }))
      count(plan, "chapters", "create")
      return { id, lessons }
    }

    planUpdate(plan, "chapters", {
      statement: () => db.update(chapter).set(fields).where(eq(chapter.id, row.id)),
      unchanged: matches(row, fields),
    })
    return { id: row.id, lessons }
  })

  planLessons(plan, state, { ...owner, chapters: targets })

  for (const row of rows.slice(chapters.length)) {
    planMissing(plan, "chapters", () => db.delete(chapter).where(eq(chapter.id, row.id)))
  }
}

const dropCourse = (plan: Plan, state: State, { cover, id: courseId }: Course["select"]): void => {
  const lessons = rowsOf(state.lessonsByCourse, courseId)
  plan.tallies.chapters.remove += rowsOf(state.chaptersByCourse, courseId).length
  plan.tallies.lessons.remove += lessons.length

  if (cover !== null) {
    plan.objectKeys.push(...coverObjectKeys(cover))
  }

  for (const row of lessons) {
    dropLessonFiles(plan, state, row.id)
  }
}

const planCourses = (plan: Plan, state: State, document: Course["document"]): void => {
  const bySlug = new Map(state.courses.map((row) => [row.slug, row]))
  const firstPosition = nextPosition(state.courses)

  for (const { chapters, ...fields } of document.courses) {
    const row = bySlug.get(fields.slug)
    if (row === undefined) {
      const id = v7()
      plan.writes.push(db.insert(course).values({ ...fields, id, position: firstPosition + plan.tallies.courses.create }))
      count(plan, "courses", "create")
      planChapters(plan, state, { chapters, courseId: id, courseSlug: fields.slug })
    } else {
      planUpdate(plan, "courses", {
        statement: () => db.update(course).set(fields).where(eq(course.id, row.id)),
        unchanged: matches(row, fields),
      })
      planChapters(plan, state, { chapters, courseId: row.id, courseSlug: fields.slug })
    }
  }

  const slugs = new Set(document.courses.map(({ slug }) => slug))
  for (const row of state.courses.filter(({ slug }) => !slugs.has(slug))) {
    if (planMissing(plan, "courses", () => db.delete(course).where(eq(course.id, row.id)))) {
      dropCourse(plan, state, row)
    }
  }
}

export const planCourseImport = async ({ document, removeMissing }: { document: Course["document"]; removeMissing: boolean }) => {
  const state = await readState()
  const plan: Plan = {
    objectKeys: [],
    removals: [],
    removeMissing,
    tallies: { chapters: emptyTally(), courses: emptyTally(), lessons: emptyTally(), links: emptyTally() },
    uploads: [],
    warnings: [],
    writes: [],
  }

  planCourses(plan, state, document)
  return plan
}

export const applyCourseImport = async (plan: Plan): Promise<void> => {
  const [first, ...rest] = [...plan.writes, ...plan.removals]

  if (first !== undefined) {
    await db.batch([first, ...rest])
    await Promise.all([removeAttachmentObjects(plan.objectKeys), removeUploadObjects(plan.uploads)])
  }
}

export const importSummary = (plan: Plan) => ({
  changes: plan.writes.length + plan.removals.length,
  files: plan.objectKeys.length + plan.uploads.length,
  tallies: plan.tallies,
  warnings: plan.warnings,
})
