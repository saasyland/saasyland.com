import { spawnSync } from "bun"
import process from "node:process"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { DEPLOY_CHECKS } from "~/src/data/deploy"

const SCRIPT_ARGUMENTS_START = 2

const [environment] = process.argv.slice(SCRIPT_ARGUMENTS_START)

if (environment !== ENVIRONMENT.PREVIEW && environment !== ENVIRONMENT.PRODUCTION) {
  throw new Error(`Expected ${ENVIRONMENT.PREVIEW} or ${ENVIRONMENT.PRODUCTION}`)
}

for (const check of DEPLOY_CHECKS) {
  const { exitCode } = spawnSync(["bun", "run", `${check}:${environment}`], { stdio: ["inherit", "inherit", "inherit"] })

  if (exitCode !== 0) {
    process.exit(exitCode)
  }
}

process.stdout.write(`Ran every deploy check the areas declare for ${environment}.\n`)
