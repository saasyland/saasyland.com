import { mkdir, readFile, writeFile } from "node:fs/promises"
import process from "node:process"
import { parseEnv } from "node:util"

import { readWranglerEnvironment } from "./wrangler-config.ts"

const SCRIPT_ARGUMENTS_START = 2
const OWNER_ONLY = 0o600

const [environment] = process.argv.slice(SCRIPT_ARGUMENTS_START)

if (environment !== "preview" && environment !== "production") {
  throw new Error("Expected preview or production")
}

const environmentFile = `.env.${environment}`
const secretsFile = `.wrangler/secrets.${environment}.json`

const { secrets } = await readWranglerEnvironment(environment)
const values = parseEnv(await readFile(environmentFile, "utf8"))
const readSecret = (name: string): [string, string] => [name, values[name] ?? ""]
const entries = secrets.required.map(readSecret)
const missing = entries.filter(([, value]) => value.trim() === "").map(([name]) => name)

if (missing.length > 0) {
  throw new Error(`Set ${missing.join(", ")} in ${environmentFile}.`)
}

await mkdir(".wrangler", { recursive: true })
await writeFile(secretsFile, JSON.stringify(Object.fromEntries(entries)), { mode: OWNER_ONLY })

process.stdout.write(`Wrote the ${String(entries.length)} secrets wrangler.jsonc declares for ${environment} to ${secretsFile}.\n`)
