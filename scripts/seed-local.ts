import { plugin } from "bun"
import { readFile } from "node:fs/promises"
import process from "node:process"
import { getPlatformProxy } from "wrangler"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { seedLocalAdmin } from "./seed-local-admin.ts"
import { seedLocalCovers, seedLocalCurriculum } from "./seed-local-courses.ts"
import { licenseSeed } from "~/e2e/data/license.seed"
import type { TestSeed } from "~/e2e/data/seed"

type LocalSeed = (env: Cloudflare.Env) => Promise<string>

const platform = await getPlatformProxy<Cloudflare.Env>({ environment: ENVIRONMENT.DEVELOPMENT })

plugin({
  name: "cloudflare-workers",
  setup: (build) => {
    build.module("cloudflare:workers", () => ({ exports: { env: platform.env }, loader: "object" }))
  },
})

const writeSeed = async (env: Cloudflare.Env, { objects, statements }: TestSeed): Promise<number> => {
  await env.DB.batch(statements.map((statement) => env.DB.prepare(statement)))
  await Promise.all(
    objects.map(async ({ binding, file, key, metadata, type }) =>
      env[binding].put(key, await readFile(file), { customMetadata: metadata, httpMetadata: { contentType: type } }),
    ),
  )

  return statements.length
}

const LOCAL_SEEDS: readonly LocalSeed[] = [
  seedLocalAdmin,
  seedLocalCurriculum,
  seedLocalCovers,
  async (env) =>
    `Licences, an order without a licence and a CLI template bundle: ${String(await writeSeed(env, await licenseSeed()))} statements`,
]

try {
  await LOCAL_SEEDS.reduce(async (previous, seed) => {
    await previous
    process.stdout.write(`${await seed(platform.env)}\n`)
  }, Promise.resolve())
} finally {
  await platform.dispose()
}
