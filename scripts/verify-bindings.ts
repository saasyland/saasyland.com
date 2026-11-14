import process from "node:process"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { readWranglerEnvironment } from "./wrangler-config.ts"

const SCRIPT_ARGUMENTS_START = 2
const PLACEHOLDER_ID = /^[0-]+$/u

const [environment] = process.argv.slice(SCRIPT_ARGUMENTS_START)

if (environment !== ENVIRONMENT.PREVIEW && environment !== ENVIRONMENT.PRODUCTION) {
  throw new Error(`Expected ${ENVIRONMENT.PREVIEW} or ${ENVIRONMENT.PRODUCTION}`)
}

const readResources = async (name: string): Promise<(string | undefined)[]> => {
  const { d1_databases: databases, kv_namespaces: namespaces, r2_buckets: buckets } = await readWranglerEnvironment(name)

  return [
    databases.find(({ binding }) => binding === "DB")?.database_id,
    namespaces.find(({ binding }) => binding === "CACHE")?.id,
    buckets.find(({ binding }) => binding === "MEDIA")?.bucket_name,
  ]
}

const resources = await readResources(environment)

if (resources.some((resource) => resource === undefined || PLACEHOLDER_ID.test(resource))) {
  throw new Error(`Provision D1, KV and R2 for ${environment}, then replace their placeholder IDs in wrangler.jsonc. See README.md.`)
}

if (environment === ENVIRONMENT.PRODUCTION) {
  const preview = new Set(await readResources(ENVIRONMENT.PREVIEW))
  const shared = resources.filter((resource) => preview.has(resource))

  if (shared.length > 0) {
    throw new Error(`Production shares ${shared.join(", ")} with preview. Give production its own D1, KV and R2 in wrangler.jsonc.`)
  }
}

process.stdout.write(`Verified the ${environment} D1, KV and R2 bindings.\n`)
