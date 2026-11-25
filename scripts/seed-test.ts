import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { getPlatformProxy } from "wrangler"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { authSeed } from "~/e2e/data/auth.seed"
import { coursesSeed } from "~/e2e/data/courses.seed"
import { licenseSeed } from "~/e2e/data/license.seed"
import { paymentsSeed } from "~/e2e/data/payments.seed"
import { productsSeed } from "~/e2e/data/products.seed"
import type { TestSeed } from "~/e2e/data/seed"
import { APP_SLUG } from "~/src/presentation/branding"

const LOCAL_TEST_STATE_DIRECTORY = ".wrangler/test"
const LOCAL_TEST_STATE = ["--env", ENVIRONMENT.TEST, "--local", "--persist-to", LOCAL_TEST_STATE_DIRECTORY]
const WRANGLER_STATE_VERSION = "v3"

const wrangler = (args: readonly string[], failure: string): void => {
  const result = spawnSync("vp", ["exec", "wrangler", ...args, ...LOCAL_TEST_STATE], { stdio: "inherit" })
  if (result.status !== 0) {
    throw new Error(failure)
  }
}

const seeds: readonly TestSeed[] = await Promise.all([authSeed(), coursesSeed(), licenseSeed(), paymentsSeed(), productsSeed()])
const statements = seeds.flatMap((seed) => seed.statements)
const objects = seeds.flatMap((seed) => seed.objects)

if (statements.length > 0) {
  const directory = await mkdtemp(join(tmpdir(), `${APP_SLUG}-test-seed-`))
  try {
    const sql = join(directory, "seed.sql")
    await writeFile(sql, statements.join("\n"))
    wrangler(["d1", "execute", "DB", "--file", sql], "Could not seed the local test database")
  } finally {
    await rm(directory, { recursive: true })
  }
}

if (objects.length > 0) {
  const platform = await getPlatformProxy<Cloudflare.Env>({
    environment: ENVIRONMENT.TEST,
    persist: { path: join(LOCAL_TEST_STATE_DIRECTORY, WRANGLER_STATE_VERSION) },
  })
  try {
    await Promise.all(
      objects.map(async ({ binding, file, key, metadata, type }) =>
        platform.env[binding].put(key, await readFile(file), { customMetadata: metadata, httpMetadata: { contentType: type } }),
      ),
    )
  } finally {
    await platform.dispose()
  }
}
