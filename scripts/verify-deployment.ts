import process from "node:process"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { verifyDeployment } from "~/src/lib/deployment"

const SCRIPT_ARGUMENTS_START = 2

const [environment] = process.argv.slice(SCRIPT_ARGUMENTS_START)

if (environment !== ENVIRONMENT.PREVIEW && environment !== ENVIRONMENT.PRODUCTION) {
  throw new Error(`Expected ${ENVIRONMENT.PREVIEW} or ${ENVIRONMENT.PRODUCTION}`)
}

process.stdout.write(`${await verifyDeployment(environment)}\n`)
