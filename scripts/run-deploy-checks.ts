import { readFileSync } from "node:fs"
import process from "node:process"
import * as zod from "zod"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { runCommand, scriptArguments } from "./run-command.ts"

const VERIFY_SCRIPT_INFIX = ":verify:"

const packageSchema = zod.object({ scripts: zod.record(zod.string(), zod.string()) })

export const deployChecks = (scripts: Readonly<Record<string, string>>, environment: string): string[] =>
  Object.keys(scripts).filter((script) => script.endsWith(`${VERIFY_SCRIPT_INFIX}${environment}`))

if (import.meta.main) {
  const [environment] = scriptArguments()

  if (environment !== ENVIRONMENT.PREVIEW && environment !== ENVIRONMENT.PRODUCTION) {
    throw new Error(`Expected ${ENVIRONMENT.PREVIEW} or ${ENVIRONMENT.PRODUCTION}`)
  }

  const { scripts } = packageSchema.parse(JSON.parse(readFileSync("package.json", "utf8")))

  for (const check of deployChecks(scripts, environment)) {
    const { status } = runCommand("bun", ["run", check])

    if (status !== 0) {
      process.exit(status)
    }
  }

  process.stdout.write(`Ran every <name>${VERIFY_SCRIPT_INFIX}${environment} script in package.json.\n`)
}
