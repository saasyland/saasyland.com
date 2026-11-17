import { readFile } from "node:fs/promises"
import process from "node:process"
import { parseEnv } from "node:util"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { verifyAuth } from "~/src/lib/auth"

const SCRIPT_ARGUMENTS_START = 2

const [environment] = process.argv.slice(SCRIPT_ARGUMENTS_START)

if (environment !== ENVIRONMENT.PREVIEW && environment !== ENVIRONMENT.PRODUCTION) {
  throw new Error(`Expected ${ENVIRONMENT.PREVIEW} or ${ENVIRONMENT.PRODUCTION}`)
}

const file = `.env.${environment}`
const values = parseEnv(await readFile(file, "utf8"))

process.stdout.write(`${verifyAuth({ file, values })}\n`)
