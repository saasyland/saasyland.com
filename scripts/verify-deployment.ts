import process from "node:process"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { verifyDeployment } from "~/src/lib/deployment"

import { scriptArguments } from "./run-command.ts"

const [environment] = scriptArguments()

if (environment !== ENVIRONMENT.PREVIEW && environment !== ENVIRONMENT.PRODUCTION) {
  throw new Error(`Expected ${ENVIRONMENT.PREVIEW} or ${ENVIRONMENT.PRODUCTION}`)
}

process.stdout.write(`${await verifyDeployment(environment)}\n`)
