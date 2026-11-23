import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { deployChecks } from "~/scripts/run-deploy-checks"

const DEPLOYED_ENVIRONMENTS = [ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION]

const { scripts } = zod.object({ scripts: zod.record(zod.string(), zod.string()) }).parse(JSON.parse(readFileSync("package.json", "utf8")))

describe("deployChecks", () => {
  it("runs every package script named <name>:verify:<environment> for that environment and nothing else", () => {
    const declared = {
      "build:preview": "vp build",
      "polar:verify:development": "bun scripts/verify-polar.ts development",
      "polar:verify:preview": "bun scripts/verify-polar.ts preview",
      "reports:verify:preview": "bun scripts/verify-reports.ts preview",
      "reports:verify:production": "bun scripts/verify-reports.ts production",
      "verify:preview": "bun scripts/verify.ts preview",
    }

    expect(deployChecks(declared, ENVIRONMENT.PREVIEW)).toStrictEqual(["polar:verify:preview", "reports:verify:preview"])
    expect(deployChecks(declared, ENVIRONMENT.PRODUCTION)).toStrictEqual(["reports:verify:production"])
  })

  it.each(DEPLOYED_ENVIRONMENTS)("finds at least one check for %s among the project's scripts", (environment) => {
    expect(deployChecks(scripts, environment)).not.toStrictEqual([])
  })

  it.each(DEPLOYED_ENVIRONMENTS)("runs the checks for %s after the bindings and the secrets and before the build", (environment) => {
    expect(scripts[`deploy:${environment}`]).toMatch(
      new RegExp(
        [
          `^bun scripts/verify-bindings\\.ts ${environment}`,
          `bun scripts/prepare-deploy-secrets\\.ts ${environment}`,
          `bun scripts/run-deploy-checks\\.ts ${environment}`,
          `bun run build:${environment} `,
        ].join(" && "),
        "u",
      ),
    )
  })

  it.each(DEPLOYED_ENVIRONMENTS)("leaves the checks out of the %s deploy script itself", (environment) => {
    expect(deployChecks(scripts, environment).filter((check) => (scripts[`deploy:${environment}`] ?? "").includes(check))).toStrictEqual([])
  })
})
