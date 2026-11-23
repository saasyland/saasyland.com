import { readdir, stat } from "node:fs/promises"
import { join, relative } from "node:path"

import { COURSE_STATUS } from "../../src/modules/course/course.constants"
import { LESSON_ATTACHMENT_KIND } from "../../src/modules/lesson-attachment/lesson-attachment.constants"
import { attachmentContentType, attachmentObjectKey } from "../../src/modules/lesson-attachment/lesson-attachment.files"
import { LESSON_STATUS } from "../../src/modules/lesson/lesson.constants"
import { MEDIA_BINDING } from "../../src/modules/video/video.constants"
import { mediaContentType, videoObjectKey } from "../../src/modules/video/video.files"
import { TEST_COURSE, TEST_LESSONS, TEST_MATERIALS } from "./courses"
import { type SeedObject, type TestSeed, json, literal } from "./seed"
import { TEST_VIDEO, TEST_VIDEOS } from "./videos"

const SQL_NULL = "NULL"

const listFixtureFiles = async (): Promise<string[]> => {
  const entries = await readdir(TEST_VIDEO.fixture, { recursive: true, withFileTypes: true })
  return entries.filter((entry) => entry.isFile()).map((entry) => relative(TEST_VIDEO.fixture, join(entry.parentPath, entry.name)))
}

const servedType = (type: string | undefined, file: string): string => {
  if (type === undefined) {
    throw new Error(`The fixture contains a file the Worker would not serve: ${file}`)
  }
  return type
}

const materialObject = (material: (typeof TEST_MATERIALS)[number]): SeedObject[] => {
  if (material.kind === LESSON_ATTACHMENT_KIND.LINK) {
    return []
  }

  return [
    {
      binding: MEDIA_BINDING,
      file: material.file,
      key: attachmentObjectKey({ attachmentId: material.id, fileName: material.fileName }),
      metadata: {},
      type: servedType(attachmentContentType(material.fileName), material.fileName),
    },
  ]
}

const materialStatement = async (material: (typeof TEST_MATERIALS)[number], position: number): Promise<string> => {
  if (material.kind === LESSON_ATTACHMENT_KIND.LINK) {
    return `INSERT INTO lesson_attachment (id, lesson_id, position, title, kind, url) VALUES (${literal(material.id)}, ${literal(material.lessonId)}, ${String(position)}, ${json(material.title)}, ${literal(material.kind)}, ${literal(material.url)}) ON CONFLICT(id) DO UPDATE SET title = excluded.title, url = excluded.url;`
  }

  const { size } = await stat(material.file)
  const objectKey = attachmentObjectKey({ attachmentId: material.id, fileName: material.fileName })
  const contentType = servedType(attachmentContentType(material.fileName), material.fileName)

  return `INSERT INTO lesson_attachment (id, lesson_id, position, title, kind, object_key, size_bytes, content_type) VALUES (${literal(material.id)}, ${literal(material.lessonId)}, ${String(position)}, ${json(material.title)}, ${literal(material.kind)}, ${literal(objectKey)}, ${String(size)}, ${literal(contentType)}) ON CONFLICT(id) DO UPDATE SET title = excluded.title, object_key = excluded.object_key, size_bytes = excluded.size_bytes;`
}

const lessonStatement = (lesson: (typeof TEST_LESSONS)[number], position: number): string => {
  const { access, chapterId, description, id, keyMoments, slug, summary, title } = lesson
  const videoId = "videoId" in lesson ? literal(lesson.videoId) : SQL_NULL

  return `INSERT INTO lesson (id, course_id, chapter_id, slug, access, status, position, title, summary, description, key_moments, video_id) VALUES (${literal(id)}, ${literal(TEST_COURSE.id)}, ${literal(chapterId)}, ${literal(slug)}, ${literal(access)}, ${literal(LESSON_STATUS.PUBLISHED)}, ${String(position)}, ${json(title)}, ${json(summary)}, ${json(description)}, ${json(keyMoments)}, ${videoId}) ON CONFLICT(id) DO UPDATE SET chapter_id = excluded.chapter_id, access = excluded.access, position = excluded.position, description = excluded.description, key_moments = excluded.key_moments, video_id = excluded.video_id;`
}

export const coursesSeed = async (): Promise<TestSeed> => {
  const files = await listFixtureFiles()
  const sizes = await Promise.all(files.map((file) => stat(join(TEST_VIDEO.fixture, file))))
  const sizeBytes = sizes.reduce((total, { size }) => total + size, 0)

  return {
    objects: [
      ...TEST_VIDEOS.flatMap(({ id }) =>
        files.map((file): SeedObject => ({
          binding: MEDIA_BINDING,
          file: join(TEST_VIDEO.fixture, file),
          key: videoObjectKey({ file, videoId: id }),
          metadata: {},
          type: servedType(mediaContentType(file), file),
        })),
      ),
      ...TEST_MATERIALS.flatMap((material) => materialObject(material)),
    ],
    statements: [
      ...TEST_VIDEOS.map(
        ({ captionLocales, durationMs, height, id, title, width }) =>
          `INSERT INTO video (id, title, duration_ms, width, height, size_bytes, caption_locales) VALUES (${literal(id)}, ${literal(title)}, ${String(durationMs)}, ${String(width)}, ${String(height)}, ${String(sizeBytes)}, ${json(captionLocales)}) ON CONFLICT(id) DO UPDATE SET title = excluded.title, size_bytes = excluded.size_bytes, caption_locales = excluded.caption_locales;`,
      ),
      `INSERT INTO course (id, slug, kind, status, level, icon, title, summary, outcomes, prerequisites) VALUES (${literal(TEST_COURSE.id)}, ${literal(TEST_COURSE.slug)}, ${literal(TEST_COURSE.kind)}, ${literal(COURSE_STATUS.PUBLISHED)}, ${literal(TEST_COURSE.level)}, ${literal(TEST_COURSE.icon)}, ${json(TEST_COURSE.title)}, ${json(TEST_COURSE.summary)}, ${json(TEST_COURSE.outcomes)}, ${json(TEST_COURSE.prerequisites)}) ON CONFLICT(id) DO UPDATE SET title = excluded.title, summary = excluded.summary, status = excluded.status, level = excluded.level, icon = excluded.icon, outcomes = excluded.outcomes, prerequisites = excluded.prerequisites;`,
      ...TEST_COURSE.chapters.map(
        (chapter, position) =>
          `INSERT INTO chapter (id, course_id, position, title, summary) VALUES (${literal(chapter.id)}, ${literal(TEST_COURSE.id)}, ${String(position)}, ${json(chapter.title)}, ${json(chapter.summary)}) ON CONFLICT(id) DO UPDATE SET position = excluded.position, title = excluded.title, summary = excluded.summary;`,
      ),
      ...TEST_LESSONS.map((lesson, position) => lessonStatement(lesson, position)),
      ...(await Promise.all(TEST_MATERIALS.map((material, position) => materialStatement(material, position)))),
    ],
  }
}
