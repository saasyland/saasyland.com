import { hashPassword } from "better-auth/crypto"
import { spawnSync } from "node:child_process"
import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"

import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { mediaContentType, videoObjectKey } from "~/src/modules/video/video.files"

import { TEST_ACCOUNTS, TEST_LICENSED_ACCOUNT, TEST_PASSWORD } from "~/e2e/data/accounts"
import { TEST_COURSE, TEST_LESSONS } from "~/e2e/data/courses"
import { TEST_LICENSE } from "~/e2e/data/licenses"
import { TEST_VIDEO } from "~/e2e/data/videos"

const TEST_BUCKET = "saasyland-test"
const LOCAL_TEST_STATE = ["--env", "test", "--local", "--persist-to", ".wrangler/test"]

const literal = (value: string): string => `'${value.replaceAll("'", "''")}'`
const json = (value: object): string => literal(JSON.stringify(value))

const wrangler = (args: readonly string[], failure: string): void => {
  const result = spawnSync("vp", ["exec", "wrangler", ...args, ...LOCAL_TEST_STATE], { stdio: "inherit" })
  if (result.status !== 0) {
    throw new Error(failure)
  }
}

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

const password = await hashPassword(TEST_PASSWORD)
const files = await listFixtureFiles()
const sizes = await Promise.all(files.map((file) => stat(join(TEST_VIDEO.fixture, file))))
const sizeBytes = sizes.reduce((total, { size }) => total + size, 0)

const statements = [
  ...[...TEST_ACCOUNTS, TEST_LICENSED_ACCOUNT].flatMap(({ email, id, name, role }) => [
    `DELETE FROM session WHERE user_id = ${literal(id)};`,
    `INSERT INTO user (id, email, name, role, email_verified) VALUES (${literal(id)}, ${literal(email)}, ${literal(name)}, ${literal(role)}, 1) ON CONFLICT(id) DO UPDATE SET email_verified = 1, role = excluded.role;`,
    `INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES (${literal(`${id}-credential`)}, ${literal(id)}, ${literal(AUTH_PROVIDER.CREDENTIAL)}, ${literal(id)}, ${literal(password)}) ON CONFLICT(id) DO UPDATE SET password = excluded.password;`,
  ]),
  `INSERT INTO license (id, user_id, tier, status, polar_customer_id, polar_order_id, polar_license_key_id, key) VALUES (${literal(TEST_LICENSE.id)}, ${literal(TEST_LICENSED_ACCOUNT.id)}, ${literal(TEST_LICENSE.tier)}, ${literal(TEST_LICENSE.status)}, ${literal(TEST_LICENSE.polarCustomerId)}, ${literal(TEST_LICENSE.polarOrderId)}, ${literal(TEST_LICENSE.polarLicenseKeyId)}, ${literal(TEST_LICENSE.key)}) ON CONFLICT(id) DO UPDATE SET status = excluded.status, polar_license_key_id = excluded.polar_license_key_id, key = excluded.key;`,
  `INSERT INTO video (id, title, duration_ms, width, height, size_bytes, caption_locales) VALUES (${literal(TEST_VIDEO.id)}, ${literal(TEST_VIDEO.title)}, ${String(TEST_VIDEO.durationMs)}, ${String(TEST_VIDEO.width)}, ${String(TEST_VIDEO.height)}, ${String(sizeBytes)}, '[]') ON CONFLICT(id) DO UPDATE SET title = excluded.title, size_bytes = excluded.size_bytes;`,
  `INSERT INTO course (id, slug, kind, status, title, summary) VALUES (${literal(TEST_COURSE.id)}, ${literal(TEST_COURSE.slug)}, ${literal(TEST_COURSE.kind)}, ${literal(COURSE_STATUS.PUBLISHED)}, ${json(TEST_COURSE.title)}, ${json(TEST_COURSE.summary)}) ON CONFLICT(id) DO UPDATE SET title = excluded.title, summary = excluded.summary, status = excluded.status;`,
  `INSERT INTO chapter (id, course_id, title) VALUES (${literal(TEST_COURSE.chapter.id)}, ${literal(TEST_COURSE.id)}, ${json(TEST_COURSE.chapter.title)}) ON CONFLICT(id) DO UPDATE SET title = excluded.title;`,
  ...TEST_LESSONS.map(
    ({ access, id, slug, summary, title, videoId }, position) =>
      `INSERT INTO lesson (id, course_id, chapter_id, slug, access, status, position, title, summary, video_id) VALUES (${literal(id)}, ${literal(TEST_COURSE.id)}, ${literal(TEST_COURSE.chapter.id)}, ${literal(slug)}, ${literal(access)}, ${literal(LESSON_STATUS.PUBLISHED)}, ${String(position)}, ${json(title)}, ${json(summary)}, ${videoId === null ? "NULL" : literal(videoId)}) ON CONFLICT(id) DO UPDATE SET access = excluded.access, position = excluded.position, video_id = excluded.video_id;`,
  ),
]

const directory = await mkdtemp(join(tmpdir(), "saasyland-test-seed-"))
try {
  const sql = join(directory, "seed.sql")
  await writeFile(sql, statements.join("\n"))
  wrangler(["d1", "execute", "DB", "--file", sql], "Could not seed the local test database")

  const uploads = [...Map.groupBy(files, contentTypeOf)].map(([type, group], index) => ({
    entries: group.map((file) => ({ file: join(TEST_VIDEO.fixture, file), key: videoObjectKey({ file, videoId: TEST_VIDEO.id }) })),
    list: join(directory, `media-${String(index)}.json`),
    type,
  }))
  await Promise.all(uploads.map(({ entries, list }) => writeFile(list, JSON.stringify(entries))))
  for (const { list, type } of uploads) {
    wrangler(["r2", "bulk", "put", TEST_BUCKET, "--content-type", type, "--filename", list], "Could not upload the video fixture")
  }
} finally {
  await rm(directory, { recursive: true })
}
