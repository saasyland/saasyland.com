import process from "node:process"
import { z } from "zod/v4"

import { readJsonc } from "./jsonc.ts"

const SCRIPT_ARGUMENTS_START = 2
const PLACEHOLDER_ID = /^[0-]+$/u

const wranglerSchema = z.object({ env: z.record(z.string(), z.unknown()) })
const databaseSchema = z.object({ database_id: z.string() })
const namespaceSchema = z.object({ id: z.string() })
const bindingsSchema = z.object({ d1_databases: z.array(databaseSchema), kv_namespaces: z.array(namespaceSchema) })

const [environment] = process.argv.slice(SCRIPT_ARGUMENTS_START)

if (environment !== "preview" && environment !== "production") {
  throw new Error("Expected preview or production")
}

const { env } = wranglerSchema.parse(await readJsonc("wrangler.jsonc"))
const bindings = bindingsSchema.optional().parse(env[environment])
const ids = [
  ...(bindings?.d1_databases.map((database) => database.database_id) ?? []),
  ...(bindings?.kv_namespaces.map((namespace) => namespace.id) ?? []),
]

if (bindings === undefined || ids.some((id) => PLACEHOLDER_ID.test(id))) {
  throw new Error(`Provision D1 and KV for ${environment}, then replace their placeholder IDs in wrangler.jsonc. See README.md.`)
}
