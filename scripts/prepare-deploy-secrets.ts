import { mkdir, readFile, writeFile } from "node:fs/promises"
import process from "node:process"
import { parseEnv } from "node:util"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { readDeploySecrets } from "~/src/lib/deploy-secrets"

import { scriptArguments } from "./run-command.ts"
import { readWranglerEnvironment } from "./wrangler-config.ts"

const OWNER_ONLY = 0o600

const [environment] = scriptArguments()

if (environment !== ENVIRONMENT.PREVIEW && environment !== ENVIRONMENT.PRODUCTION) {
  throw new Error(`Expected ${ENVIRONMENT.PREVIEW} or ${ENVIRONMENT.PRODUCTION}`)
}

const environmentFile = `.env.${environment}`
const secretsFile = `.wrangler/secrets.${environment}.json`

const { secrets } = await readWranglerEnvironment(environment)
const values = parseEnv(await readFile(environmentFile, "utf8"))
const deploySecrets = readDeploySecrets({ file: environmentFile, names: secrets.required, values })

await mkdir(".wrangler", { recursive: true })
await writeFile(secretsFile, JSON.stringify(deploySecrets), { mode: OWNER_ONLY })

process.stdout.write(`Wrote the ${String(secrets.required.length)} secrets wrangler.jsonc declares for ${environment} to ${secretsFile}.\n`)
