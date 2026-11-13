import { hashPassword } from "better-auth/crypto"
import { spawnSync } from "node:child_process"
import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"

import { mediaContentType, videoObjectKey } from "~/src/modules/video/video.files"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "~/e2e/data/accounts"
import { TEST_VIDEO } from "~/e2e/data/videos"

const TEST_BUCKET = "saasyland-test"
const LOCAL_TEST_STATE = ["--env", "test", "--local", "--persist-to", ".wrangler/test"]

const literal = (value: string): string => `'${value.replaceAll("'", "''")}'`

const wrangler = (args: readonly string[], failure: string): void => {
  const result = spawnSync("bun", ["x", "wrangler", ...args, ...LOCAL_TEST_STATE], { stdio: "inherit" })
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
  ...TEST_ACCOUNTS.flatMap(({ email, id, name, role }) => [
    `DELETE FROM session WHERE user_id = ${literal(id)};`,
    `INSERT INTO user (id, email, name, role, email_verified) VALUES (${literal(id)}, ${literal(email)}, ${literal(name)}, ${literal(role)}, 1) ON CONFLICT(id) DO UPDATE SET email_verified = 1, role = excluded.role;`,
    `INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES (${literal(`${id}-credential`)}, ${literal(id)}, 'credential', ${literal(id)}, ${literal(password)}) ON CONFLICT(id) DO UPDATE SET password = excluded.password;`,
  ]),
  `INSERT INTO video (id, title, duration_ms, width, height, size_bytes, caption_locales) VALUES (${literal(TEST_VIDEO.id)}, ${literal(TEST_VIDEO.title)}, ${String(TEST_VIDEO.durationMs)}, ${String(TEST_VIDEO.width)}, ${String(TEST_VIDEO.height)}, ${String(sizeBytes)}, '[]') ON CONFLICT(id) DO UPDATE SET title = excluded.title, size_bytes = excluded.size_bytes;`,
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
