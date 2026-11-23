import { type ParseError, parse } from "jsonc-parser"
import { readFile } from "node:fs/promises"
import * as zod from "zod"

const WRANGLER_CONFIG = "wrangler.jsonc"

const databaseSchema = zod.object({ binding: zod.string(), database_id: zod.string(), preview_database_id: zod.string().optional() })
const namespaceSchema = zod.object({ binding: zod.string(), id: zod.string() })
const bucketSchema = zod.object({ binding: zod.string(), bucket_name: zod.string() })
const secretsSchema = zod.object({ required: zod.array(zod.string()) })

const environmentSchema = zod.object({
  d1_databases: zod.array(databaseSchema).default([]),
  kv_namespaces: zod.array(namespaceSchema).default([]),
  name: zod.string(),
  r2_buckets: zod.array(bucketSchema).default([]),
  secrets: secretsSchema,
  vars: zod.record(zod.string(), zod.string()).optional(),
})

const wranglerSchema = zod.object({ env: zod.record(zod.string(), environmentSchema) })

interface WranglerBinding {
  readonly binding: string
  readonly resource: string
}

const readWranglerEnvironments = async (): Promise<zod.infer<typeof wranglerSchema>["env"]> => {
  const errors: ParseError[] = []
  const value: unknown = parse(await readFile(WRANGLER_CONFIG, "utf8"), errors, { allowTrailingComma: true })
  if (errors.length > 0) {
    throw new Error(`Invalid JSONC configuration: ${WRANGLER_CONFIG}`)
  }

  return wranglerSchema.parse(value).env
}

export const readWranglerEnvironment = async (environment: string): Promise<zod.infer<typeof environmentSchema>> => {
  const environments = await readWranglerEnvironments()
  const config = environments[environment]
  if (config === undefined) {
    throw new Error(`${WRANGLER_CONFIG} has no ${environment} environment`)
  }

  return config
}

export const readWranglerBindings = async (environment: string): Promise<WranglerBinding[]> => {
  const { d1_databases: databases, kv_namespaces: namespaces, r2_buckets: buckets } = await readWranglerEnvironment(environment)

  return [
    ...databases.map(({ binding, database_id: resource }) => ({ binding, resource })),
    ...namespaces.map(({ binding, id: resource }) => ({ binding, resource })),
    ...buckets.map(({ binding, bucket_name: resource }) => ({ binding, resource })),
  ]
}

export const readBucketName = async ({ binding, environment }: { binding: string; environment: string }): Promise<string> => {
  const { r2_buckets: buckets } = await readWranglerEnvironment(environment)
  const bucket = buckets.find((entry) => entry.binding === binding)
  if (bucket === undefined) {
    throw new Error(`${WRANGLER_CONFIG} has no ${binding} R2 binding for ${environment}`)
  }

  return bucket.bucket_name
}

export const readBucketNames = async (binding: string): Promise<(readonly [environment: string, bucket: string])[]> =>
  Object.entries(await readWranglerEnvironments()).flatMap(([environment, { r2_buckets: buckets }]) =>
    buckets.filter((entry) => entry.binding === binding).map(({ bucket_name: bucket }) => [environment, bucket] as const),
  )
