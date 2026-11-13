import { type ParseError, parse } from "jsonc-parser"
import { readFile } from "node:fs/promises"
import { z } from "zod/v4"

const WRANGLER_CONFIG = "wrangler.jsonc"

const databaseSchema = z.object({ binding: z.string(), database_id: z.string() })
const namespaceSchema = z.object({ binding: z.string(), id: z.string() })
const bucketSchema = z.object({ binding: z.string(), bucket_name: z.string() })
const secretsSchema = z.object({ required: z.array(z.string()) })

const environmentSchema = z.object({
  d1_databases: z.array(databaseSchema),
  kv_namespaces: z.array(namespaceSchema),
  name: z.string(),
  r2_buckets: z.array(bucketSchema),
  secrets: secretsSchema,
})

const wranglerSchema = z.object({ env: z.record(z.string(), environmentSchema) })

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
