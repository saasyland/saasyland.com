import { readdir, stat } from "node:fs/promises"
import { join, relative } from "node:path"

import { COURSE_STATUS } from "../../src/modules/course/course.constants"
import { LESSON_STATUS } from "../../src/modules/lesson/lesson.constants"
import { MEDIA_BINDING } from "../../src/modules/video/video.constants"
import { mediaContentType, videoObjectKey } from "../../src/modules/video/video.files"
import { TEST_COURSE, TEST_LESSONS } from "./courses"
import { type TestSeed, json, literal } from "./seed"
import { TEST_VIDEO } from "./videos"

const listFixtureFiles = async (): Promise<string[]> => {
  const entries = await readdir(TEST_VIDEO.fixture, { recursive: true, withFileTypes: true })
  return entries.filter((entry) => entry.isFile()).map((entry) => relative(TEST_VIDEO.fixture, join(entry.parentPath, entry.name)))
}

const contentTypeOf = (file: string): string => {
  const type = mediaContentType(file)
  if (type === undefined) {
    throw new Error(`The video fixture contains a file the Worker would not serve: ${file}`)
  }
  return type
}

export const coursesSeed = async (): Promise<TestSeed> => {
  const files = await listFixtureFiles()
  const sizes = await Promise.all(files.map((file) => stat(join(TEST_VIDEO.fixture, file))))
  const sizeBytes = sizes.reduce((total, { size }) => total + size, 0)

  return {
    objects: files.map((file) => ({
      binding: MEDIA_BINDING,
      file: join(TEST_VIDEO.fixture, file),
      key: videoObjectKey({ file, videoId: TEST_VIDEO.id }),
      metadata: {},
      type: contentTypeOf(file),
    })),
    statements: [
      `INSERT INTO video (id, title, duration_ms, width, height, size_bytes, caption_locales) VALUES (${literal(TEST_VIDEO.id)}, ${literal(TEST_VIDEO.title)}, ${String(TEST_VIDEO.durationMs)}, ${String(TEST_VIDEO.width)}, ${String(TEST_VIDEO.height)}, ${String(sizeBytes)}, '[]') ON CONFLICT(id) DO UPDATE SET title = excluded.title, size_bytes = excluded.size_bytes;`,
      `INSERT INTO course (id, slug, kind, status, title, summary) VALUES (${literal(TEST_COURSE.id)}, ${literal(TEST_COURSE.slug)}, ${literal(TEST_COURSE.kind)}, ${literal(COURSE_STATUS.PUBLISHED)}, ${json(TEST_COURSE.title)}, ${json(TEST_COURSE.summary)}) ON CONFLICT(id) DO UPDATE SET title = excluded.title, summary = excluded.summary, status = excluded.status;`,
      `INSERT INTO chapter (id, course_id, title) VALUES (${literal(TEST_COURSE.chapter.id)}, ${literal(TEST_COURSE.id)}, ${json(TEST_COURSE.chapter.title)}) ON CONFLICT(id) DO UPDATE SET title = excluded.title;`,
      ...TEST_LESSONS.map(
        ({ access, id, slug, summary, title, videoId }, position) =>
          `INSERT INTO lesson (id, course_id, chapter_id, slug, access, status, position, title, summary, video_id) VALUES (${literal(id)}, ${literal(TEST_COURSE.id)}, ${literal(TEST_COURSE.chapter.id)}, ${literal(slug)}, ${literal(access)}, ${literal(LESSON_STATUS.PUBLISHED)}, ${String(position)}, ${json(title)}, ${json(summary)}, ${videoId === null ? "NULL" : literal(videoId)}) ON CONFLICT(id) DO UPDATE SET access = excluded.access, position = excluded.position, video_id = excluded.video_id;`,
      ),
    ],
  }
}
