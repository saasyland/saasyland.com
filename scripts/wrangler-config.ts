import { type ParseError, parse } from "jsonc-parser"
import { readFile } from "node:fs/promises"
import { z } from "zod/v4"

const WRANGLER_CONFIG = "wrangler.jsonc"

const databaseSchema = z.object({ binding: z.string(), database_id: z.string() })
const namespaceSchema = z.object({ binding: z.string(), id: z.string() })
const bucketSchema = z.object({ binding: z.string(), bucket_name: z.string() })
const secretsSchema = z.object({ required: z.array(z.string()) })

const environmentSchema = z.object({
  d1_databases: z.array(databaseSchema).default([]),
  kv_namespaces: z.array(namespaceSchema).default([]),
  name: z.string(),
  r2_buckets: z.array(bucketSchema).default([]),
  secrets: secretsSchema,
  vars: z.record(z.string(), z.string()).optional(),
})

const wranglerSchema = z.object({ env: z.record(z.string(), environmentSchema) })

interface WranglerBinding {
  readonly binding: string
  readonly resource: string
}

export const readWranglerEnvironment = async (environment: string): Promise<z.infer<typeof environmentSchema>> => {
  const errors: ParseError[] = []
  const value: unknown = parse(await readFile(WRANGLER_CONFIG, "utf8"), errors, { allowTrailingComma: true })
  if (errors.length > 0) {
    throw new Error(`Invalid JSONC configuration: ${WRANGLER_CONFIG}`)
  }

  const config = wranglerSchema.parse(value).env[environment]
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
