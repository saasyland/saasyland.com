import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import { z } from "zod/v4"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { DEPLOY_CHECKS } from "~/src/data/deploy"

const DEPLOYED_ENVIRONMENTS = [ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION]

const { scripts } = z.object({ scripts: z.record(z.string(), z.string()) }).parse(JSON.parse(readFileSync("package.json", "utf8")))

describe("deploy checks", () => {
  it.each(DEPLOYED_ENVIRONMENTS)("names a package script for %s for every check an area declares", (environment) => {
    expect(DEPLOY_CHECKS.filter((check) => scripts[`${check}:${environment}`] === undefined)).toStrictEqual([])
  })

  it.each(DEPLOYED_ENVIRONMENTS)(
    "runs every area's checks for %s after the bindings and the secrets and before the build",
    (environment) => {
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
    },
  )

  it.each(DEPLOYED_ENVIRONMENTS)("leaves the checks of the areas out of the %s deploy script itself", (environment) => {
    expect(DEPLOY_CHECKS.filter((check) => (scripts[`deploy:${environment}`] ?? "").includes(check))).toStrictEqual([])
  })
})
