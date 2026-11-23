import { readFile } from "node:fs/promises"
import process from "node:process"
import { parseEnv } from "node:util"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { verifyPolar } from "~/src/lib/polar"

import { scriptArguments } from "./run-command.ts"

const [environment] = scriptArguments()

if (environment !== ENVIRONMENT.DEVELOPMENT && environment !== ENVIRONMENT.PREVIEW && environment !== ENVIRONMENT.PRODUCTION) {
  throw new Error(`Expected ${ENVIRONMENT.DEVELOPMENT}, ${ENVIRONMENT.PREVIEW} or ${ENVIRONMENT.PRODUCTION}`)
}

const values = parseEnv(await readFile(`.env.${environment}`, "utf8"))

process.stdout.write(`${await verifyPolar({ environment, values })}\n`)
