import { eq } from "drizzle-orm"
import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import { v7 } from "uuid"

import { COURSE_COVER_STORED_TYPES, COURSE_COVER_WIDTHS, coverObjectKey, coverVariantKey } from "~/src/modules/course/course.cover"
import { course } from "~/src/modules/course/course.schema"

const CURRICULUM = "content/courses/saasy-land-courses.json"
const COVERS = "content/courses/covers"
const COVER_EXTENSION = "webp"

const isReadable = (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  )

export const seedLocalCurriculum = async (): Promise<string> => {
  const { applyCourseImport, importSummary, planCourseImport, readCourseDocument } = await import("~/src/modules/course/course.transfer")
  const read = readCourseDocument(await readFile(CURRICULUM, "utf8"))
  if (!("document" in read)) {
    throw new Error(`${CURRICULUM} is not a course file this version can import: ${JSON.stringify(read.problems)}`)
  }

  const plan = await planCourseImport({ document: read.document, removeMissing: false })
  await applyCourseImport(plan)

  const { tallies, warnings } = importSummary(plan)
  const counts = Object.entries(tallies).map(
    ([entity, { create, unchanged, update }]) => `${entity} +${String(create)} ~${String(update)} =${String(unchanged)}`,
  )

  return `Curriculum from ${CURRICULUM}: ${counts.join(", ")}; ${String(warnings.length)} missing videos`
}

export const seedLocalCovers = async (env: Cloudflare.Env): Promise<string> => {
  const { db } = await import("~/src/integrations/drizzle-orm/drizzle.database")
  const rows = await db.select({ cover: course.cover, id: course.id, slug: course.slug }).from(course)
  const sources = rows.flatMap(({ cover, id, slug }) =>
    cover === null ? [{ id, source: join(COVERS, `${slug}.${COVER_EXTENSION}`) }] : [],
  )
  const found = await Promise.all(sources.map(async (entry) => ((await isReadable(entry.source)) ? [entry] : [])))

  const covered = found.flat()

  await Promise.all(
    covered.map(async ({ id, source }) => {
      const cover = coverObjectKey({ courseId: id, coverId: v7(), extension: COVER_EXTENSION })
      await Promise.all(
        COURSE_COVER_WIDTHS.map(async (width) =>
          env.MEDIA.put(coverVariantKey(cover, width), await readFile(coverVariantKey(source, width)), {
            httpMetadata: { contentType: COURSE_COVER_STORED_TYPES[COVER_EXTENSION] },
          }),
        ),
      )
      await db.update(course).set({ cover }).where(eq(course.id, id))
    }),
  )

  return `Covers from ${COVERS}: ${String(covered.length)} courses`
}
