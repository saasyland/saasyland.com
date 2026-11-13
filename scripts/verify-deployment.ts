import process from "node:process"

import { verifyDeployment } from "~/src/lib/deployment"

const SCRIPT_ARGUMENTS_START = 2

const [environment] = process.argv.slice(SCRIPT_ARGUMENTS_START)

if (environment !== "preview" && environment !== "production") {
  throw new Error("Expected preview or production")
}

process.stdout.write(`${await verifyDeployment(environment)}\n`)
