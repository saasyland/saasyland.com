import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import packageJson from "~/package.json"
import { collectRepositoryFacts } from "~/scripts/repository-facts"

const configWith = ({ hookTimeout = 4000, lines = 90 }: { hookTimeout?: number; lines?: number } = {}) => ({
  fmt: { printWidth: 120, tabWidth: 4 },
  lint: {
    rules: {
      "max-lines": ["error", { max: 500 }],
      "max-lines-per-function": ["error", { max: 80 }],
      "max-statements": ["error", { max: 15 }],
    },
  },
  test: {
    coverage: { thresholds: { branches: 90, functions: 90, lines, statements: 90 } },
    projects: [{ test: { name: "node" } }, { test: { hookTimeout, name: "integration", testTimeout: 4000 } }],
  },
})

describe("collectRepositoryFacts", () => {
  it("reads the coverage threshold, lint limits, formatter widths and test timeout from the Vite config", () => {
    expect(collectRepositoryFacts(configWith())).toMatchObject({
      coverageThreshold: 90,
      integrationTestTimeoutSeconds: 4,
      maxLines: 500,
      maxLinesPerFunction: 80,
      maxStatements: 15,
      printWidth: 120,
      tabWidth: 4,
    })
  })

  it("refuses coverage thresholds that the docs could not state as one number", () => {
    expect(() => collectRepositoryFacts(configWith({ lines: 95 }))).toThrow("one coverage threshold")
  })

  it("refuses test and hook timeouts that the docs could not state as one duration", () => {
    expect(() => collectRepositoryFacts(configWith({ hookTimeout: 8000 }))).toThrow("one timeout")
  })
})

describe("REPOSITORY_FACTS", () => {
  it("reads the toolchain versions from .nvmrc and packageManager", () => {
    expect(readFileSync(".nvmrc", "utf8").trim()).toBe(REPOSITORY_FACTS.nodeVersion)
    expect(packageJson.packageManager).toBe(`bun@${REPOSITORY_FACTS.bunVersion}`)
  })

  it("reads the schedule of the full browser run from its workflow", () => {
    expect(readFileSync(".github/workflows/e2e-full.yml", "utf8")).toContain(`cron: "${REPOSITORY_FACTS.e2eFullSchedule}"`)
  })
})
