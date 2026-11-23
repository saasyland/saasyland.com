import { type SQL, type SQLChunk, eq, getTableColumns, inArray, ne, sql } from "drizzle-orm"
import { SQLiteSyncDialect, type SQLiteTable } from "drizzle-orm/sqlite-core"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import process from "node:process"
import * as zod from "zod"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import { LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import { lesson } from "~/src/modules/lesson/lesson.schema"

import { type D1Environment, executeD1, inline } from "./d1-execute.ts"

const SOURCE = ENVIRONMENT.PRODUCTION
const TARGET = ENVIRONMENT.PREVIEW
const ID = "id"
const STATEMENTS_FILE = "courses.sql"
const TEMPORARY_PREFIX = "saasyland-courses-"

const cellSchema = zod.union([zod.string(), zod.number(), zod.null()])
const rowSchema = zod.record(zod.string(), cellSchema)
const rowsSchema = zod.array(rowSchema)
const idsSchema = zod.array(zod.object({ id: zod.string() }))
const slugsSchema = zod.array(zod.object({ id: zod.string(), slug: zod.string() }))
const countSchema = zod.tuple([zod.object({ count: zod.number() })])

type Row = zod.infer<typeof rowSchema>

const dialect = new SQLiteSyncDialect()

const statement = (query: SQL): string => `${inline(dialect.sqlToQuery(query))};`

const selectRows = (table: SQLiteTable, where: SQL): string => statement(sql`select * from ${table} where ${where}`)

const selectIds = (table: SQLiteTable, where: SQL): string => statement(sql`select ${sql.identifier(ID)} from ${table} where ${where}`)

const countRows = (table: SQLiteTable, where: SQL): string => statement(sql`select count(*) as count from ${table} where ${where}`)

const deleteRows = (table: SQLiteTable, where: SQL): string => statement(sql`delete from ${table} where ${where}`)

const both = (first: SQL, second: SQL): SQL => sql`${first} and ${second}`

const read = (environment: D1Environment, statements: readonly string[]): Promise<unknown[][]> =>
  executeD1({ environment, input: ["--command", statements.join("\n")] })

const idsOf = (rows: readonly Readonly<Record<string, unknown>>[]): string[] => rows.map((row) => zod.string().parse(row[ID]))

const idSetOf = (rows: unknown): Set<string> => new Set(idsOf(idsSchema.parse(rows)))

const readProduction = async () => {
  const [courses, retired] = await read(SOURCE, [
    selectRows(course, eq(course.status, COURSE_STATUS.PUBLISHED)),
    selectIds(course, ne(course.status, COURSE_STATUS.PUBLISHED)),
  ])
  const courseRows = rowsSchema.parse(courses)
  const courseIds = idsOf(courseRows)

  const [chapters, lessons] = await read(SOURCE, [
    selectRows(chapter, inArray(chapter.courseId, courseIds)),
    selectRows(lesson, inArray(lesson.courseId, courseIds)),
  ])
  const lessonRows = rowsSchema.parse(lessons)

  const ofLessons = inArray(lessonAttachment.lessonId, idsOf(lessonRows))
  const isLink = eq(lessonAttachment.kind, LESSON_ATTACHMENT_KIND.LINK)
  const isFile = eq(lessonAttachment.kind, LESSON_ATTACHMENT_KIND.FILE)
  const [links, files] = await read(SOURCE, [
    selectRows(lessonAttachment, both(ofLessons, isLink)),
    selectIds(lessonAttachment, both(ofLessons, isFile)),
  ])

  return {
    chapters: rowsSchema.parse(chapters),
    courses: courseRows,
    files: idsSchema.parse(files).length,
    lessons: lessonRows,
    links: rowsSchema.parse(links),
    retired: idsOf(idsSchema.parse(retired)),
  }
}

type Catalogue = Awaited<ReturnType<typeof readProduction>>

const readPreview = async (catalogue: Catalogue) => {
  const courseIds = idsOf(catalogue.courses)
  const slugs = catalogue.courses.map((row) => zod.string().parse(row[course.slug.name]))
  const known = [...courseIds, ...catalogue.retired]
  const previewLessons = sql`select ${sql.identifier(ID)} from ${lesson} where ${inArray(lesson.courseId, courseIds)}`
  const linksOfLessons = both(
    inArray(lessonAttachment.lessonId, sql`(${previewLessons})`),
    eq(lessonAttachment.kind, LESSON_ATTACHMENT_KIND.LINK),
  )
  const sameSlug = sql`select ${sql.identifier(ID)}, ${sql.identifier(course.slug.name)} from ${course} where ${inArray(course.slug, slugs)}`
  const [slugged, courses, chapters, lessons, links] = await read(TARGET, [
    statement(sameSlug),
    selectIds(course, inArray(course.id, known)),
    selectIds(chapter, inArray(chapter.courseId, courseIds)),
    statement(previewLessons),
    selectIds(lessonAttachment, linksOfLessons),
  ])

  return {
    chapters: idSetOf(chapters),
    conflicts: slugsSchema.parse(slugged).filter(({ id }) => !courseIds.includes(id)),
    courses: idSetOf(courses),
    lessons: idSetOf(lessons),
    links: idSetOf(links),
  }
}

type Preview = Awaited<ReturnType<typeof readPreview>>

const listOf = (parts: SQLChunk[]): SQL => sql.join(parts, sql`, `)

interface Upsert {
  readonly omit?: readonly string[]
  readonly row: Row
  readonly table: SQLiteTable
}

const upsert = ({ omit = [], row, table }: Upsert): string => {
  const columns = Object.values(getTableColumns(table))
    .map(({ name }) => name)
    .filter((name) => !omit.includes(name))
  const names = listOf(columns.map((name) => sql.identifier(name)))
  const values = listOf(columns.map((name) => sql`${cellSchema.parse(row[name])}`))
  const updates = columns.filter((name) => name !== ID).map((name) => sql`${sql.identifier(name)} = excluded.${sql.identifier(name)}`)

  return statement(
    sql`insert into ${table} (${names}) values (${values}) on conflict (${sql.identifier(ID)}) do update set ${listOf(updates)}`,
  )
}

interface Change {
  readonly created: number
  readonly removed: number
  readonly updated: number
}

const changeOf = ({ existing, removed, rows }: { existing: ReadonlySet<string>; removed: number; rows: readonly Row[] }): Change => {
  const updated = idsOf(rows).filter((id) => existing.has(id)).length
  return { created: rows.length - updated, removed, updated }
}

const missingFrom = (existing: ReadonlySet<string>, rows: readonly Row[]): string[] => {
  const kept = new Set(idsOf(rows))
  return [...existing].filter((id) => !kept.has(id))
}

const planSync = (catalogue: Catalogue, preview: Preview) => {
  const published = new Set(idsOf(catalogue.courses))
  const retired = [...preview.courses].filter((id) => !published.has(id))
  const links = missingFrom(preview.links, catalogue.links)
  const lessons = missingFrom(preview.lessons, catalogue.lessons)
  const chapters = missingFrom(preview.chapters, catalogue.chapters)
  const fileColumns = [course.cover.name]
  const videoColumns = [lesson.videoId.name]

  const statements = [
    deleteRows(course, inArray(course.id, retired)),
    deleteRows(lessonAttachment, inArray(lessonAttachment.id, links)),
    deleteRows(lesson, inArray(lesson.id, lessons)),
    deleteRows(chapter, inArray(chapter.id, chapters)),
    ...catalogue.courses.map((row) => upsert({ omit: fileColumns, row, table: course })),
    ...catalogue.chapters.map((row) => upsert({ row, table: chapter })),
    ...catalogue.lessons.map((row) => upsert({ omit: videoColumns, row, table: lesson })),
    ...catalogue.links.map((row) => upsert({ row, table: lessonAttachment })),
  ]

  const changes = {
    chapter: changeOf({ existing: preview.chapters, removed: chapters.length, rows: catalogue.chapters }),
    course: changeOf({ existing: preview.courses, removed: retired.length, rows: catalogue.courses }),
    lesson: changeOf({ existing: preview.lessons, removed: lessons.length, rows: catalogue.lessons }),
    lesson_attachment: changeOf({ existing: preview.links, removed: links.length, rows: catalogue.links }),
  }

  return { changes, statements }
}

const write = async (statements: readonly string[]): Promise<void> => {
  const directory = await mkdtemp(join(tmpdir(), TEMPORARY_PREFIX))
  const file = join(directory, STATEMENTS_FILE)
  try {
    await writeFile(file, statements.join("\n"))
    await executeD1({ environment: TARGET, input: ["--file", file] })
  } finally {
    await rm(directory, { force: true, recursive: true })
  }
}

const countPreview = async (catalogue: Catalogue): Promise<number[]> => {
  const courseIds = idsOf(catalogue.courses)
  const linkIds = idsOf(catalogue.links)
  const results = await read(TARGET, [
    countRows(course, inArray(course.id, courseIds)),
    countRows(chapter, inArray(chapter.courseId, courseIds)),
    countRows(lesson, inArray(lesson.courseId, courseIds)),
    countRows(lessonAttachment, inArray(lessonAttachment.id, linkIds)),
  ])

  return results.map((rows) => countSchema.parse(rows)[0].count)
}

const summary = (table: string, { created, removed, updated }: Change): string =>
  `${table}: ${String(created)} created, ${String(updated)} updated, ${String(removed)} removed\n`

const syncCourses = async (): Promise<void> => {
  process.stdout.write(`Reading the published courses of the ${SOURCE} database\n`)
  const catalogue = await readProduction()

  process.stdout.write(`Comparing them with the ${TARGET} database\n`)
  const preview = await readPreview(catalogue)
  const [conflict] = preview.conflicts
  if (conflict !== undefined) {
    throw new Error(
      `The ${TARGET} course ${conflict.slug} (${conflict.id}) has the slug of a ${SOURCE} course with another id. Delete it in the ${TARGET} admin, then run this again.`,
    )
  }

  const { changes, statements } = planSync(catalogue, preview)
  await write(statements)

  for (const [table, change] of Object.entries(changes)) {
    process.stdout.write(summary(table, change))
  }
  if (catalogue.files > 0) {
    process.stdout.write(`${String(catalogue.files)} file attachments left out: their files are in the ${SOURCE} bucket\n`)
  }
  process.stdout.write(
    `Lessons keep the videos of the ${TARGET} database; new ones start without one: the recordings are in the ${SOURCE} bucket\n`,
  )

  const tables = [catalogue.courses, catalogue.chapters, catalogue.lessons, catalogue.links]
  const expected = tables.map((rows) => rows.length)
  const found = await countPreview(catalogue)
  if (found.some((count, index) => count !== expected[index])) {
    throw new Error(`The ${TARGET} database holds ${found.join(", ")} of these rows instead of ${expected.join(", ")}. Run this again.`)
  }
  process.stdout.write(`The ${TARGET} database holds the ${String(catalogue.courses.length)} published ${SOURCE} courses\n`)
}

await syncCourses()
