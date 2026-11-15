import { spawnSync } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { readBucketName } from "./wrangler-config.ts"
import * as AREA_SEEDS from "~/e2e/data/seed.entries"
import { APP_SLUG } from "~/src/presentation/branding"

const LOCAL_TEST_STATE = ["--env", ENVIRONMENT.TEST, "--local", "--persist-to", ".wrangler/test"]

const wrangler = (args: readonly string[], failure: string): void => {
  const result = spawnSync("vp", ["exec", "wrangler", ...args, ...LOCAL_TEST_STATE], { stdio: "inherit" })
  if (result.status !== 0) {
    throw new Error(failure)
  }
}

const seeds = await Promise.all(Object.values(AREA_SEEDS).map((seed) => seed()))
const statements = seeds.flatMap((seed) => seed.statements)
const objects = seeds.flatMap((seed) => seed.objects)

const directory = await mkdtemp(join(tmpdir(), `${APP_SLUG}-test-seed-`))
try {
  const sql = join(directory, "seed.sql")
  await writeFile(sql, statements.join("\n"))
  wrangler(["d1", "execute", "DB", "--file", sql], "Could not seed the local test database")

  const groups = await Promise.all(
    [...Map.groupBy(objects, ({ binding }) => binding)].map(async ([binding, group]) => {
      const bucket = await readBucketName({ binding, environment: ENVIRONMENT.TEST })
      return [...Map.groupBy(group, ({ type }) => type)].map(([type, files]) => ({ bucket, files, type }))
    }),
  )
  const uploads = groups.flat().map(({ bucket, files, type }, index) => ({
    bucket,
    entries: files.map(({ file, key }) => ({ file, key })),
    list: join(directory, `media-${String(index)}.json`),
    type,
  }))
  await Promise.all(uploads.map(({ entries, list }) => writeFile(list, JSON.stringify(entries))))
  for (const { bucket, list, type } of uploads) {
    wrangler(["r2", "bulk", "put", bucket, "--content-type", type, "--filename", list], "Could not upload the seeded media")
  }
} finally {
  await rm(directory, { recursive: true })
}
