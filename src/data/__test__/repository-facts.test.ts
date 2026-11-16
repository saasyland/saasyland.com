import { API_BASE_PATH, API_HEADER, API_LIMIT, RATE_LIMIT } from "@saasyland/stack/api"
import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "~/e2e/data/accounts"
import { TEST_LICENSE, TEST_LICENSED_ACCOUNT } from "~/e2e/data/licenses"
import packageJson from "~/package.json"
import { collectRepositoryFacts, collectSeededAccounts } from "~/scripts/repository-facts"

const configWith = ({
  hookTimeout = 4000,
  lines = 90,
  reporter = ["text", "json-summary"],
}: { hookTimeout?: number; lines?: number; reporter?: string[] } = {}) => ({
  fmt: { printWidth: 120, tabWidth: 4 },
  lint: {
    rules: {
      "max-lines": ["error", { max: 500 }],
      "max-lines-per-function": ["error", { max: 80 }],
      "max-statements": ["error", { max: 15 }],
    },
  },
  test: {
    coverage: { reporter, reportsDirectory: "./reports", thresholds: { branches: 90, functions: 90, lines, statements: 90 } },
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

  it("reads the CLI licence API's path, header, label limit, bundle URL lifetime and rate limits from the contract", () => {
    expect(collectRepositoryFacts(configWith())).toMatchObject({
      cliApiBasePath: API_BASE_PATH,
      cliApiBundleUrlTtlSeconds: API_LIMIT.BUNDLE_URL_TTL_SECONDS,
      cliApiLabelMaxLength: API_LIMIT.LABEL_MAX_LENGTH,
      cliApiMachineHeader: API_HEADER.MACHINE,
      cliApiRateLimitSeconds: RATE_LIMIT.PERIOD_SECONDS,
      cliApiRequestsPerAddress: RATE_LIMIT.REQUESTS_PER_ADDRESS,
      cliApiRequestsPerLicenseKey: RATE_LIMIT.REQUESTS_PER_LICENSE_KEY,
    })
  })

  it("prints the password of the seeded accounts from the browser test data", () => {
    expect(collectRepositoryFacts(configWith()).testPassword).toBe(TEST_PASSWORD)
  })

  it("finds the coverage summary in the configured reports directory", () => {
    expect(collectRepositoryFacts(configWith()).coverageSummaryPath).toBe("reports/coverage-summary.json")
  })

  it("refuses a coverage configuration that does not write the summary the landing page cites", () => {
    expect(() => collectRepositoryFacts(configWith({ reporter: ["text"] }))).toThrow("coverage summary report")
  })

  it("refuses coverage thresholds that the docs could not state as one number", () => {
    expect(() => collectRepositoryFacts(configWith({ lines: 95 }))).toThrow("one coverage threshold")
  })

  it("refuses test and hook timeouts that the docs could not state as one duration", () => {
    expect(() => collectRepositoryFacts(configWith({ hookTimeout: 8000 }))).toThrow("one timeout")
  })
})

describe("collectSeededAccounts", () => {
  it("lists every account the test seed creates once, with its role", () => {
    const accounts = collectSeededAccounts()

    expect(accounts.map(([email, role]) => ({ email, role }))).toStrictEqual(
      [...TEST_ACCOUNTS, TEST_LICENSED_ACCOUNT].map(({ email, role }) => ({ email, role })),
    )
    expect(new Set(accounts.map(([email]) => email)).size).toBe(accounts.length)
  })

  it("names the tier of the seeded licence beside the licensed account only", () => {
    const tiers = new Map(collectSeededAccounts().map(([email, , licensed]) => [email, licensed]))

    expect(tiers.get(TEST_LICENSED_ACCOUNT.email)).toStrictEqual([TEST_LICENSE.tier])
    for (const { email } of TEST_ACCOUNTS) {
      expect(tiers.get(email)).toStrictEqual([])
    }
  })
})

describe("REPOSITORY_FACTS", () => {
  it("reads the toolchain versions from .nvmrc and packageManager", () => {
    expect(readFileSync(".nvmrc", "utf8").trim()).toBe(REPOSITORY_FACTS.nodeVersion)
    expect(packageJson.packageManager).toBe(`bun@${REPOSITORY_FACTS.bunVersion}`)
  })

  it("cites paths the repository has and commands package.json defines", () => {
    const commands = Object.keys(packageJson.scripts).map((script) => `bun run ${script}`)

    for (const path of [
      REPOSITORY_FACTS.authIntegrationPath,
      REPOSITORY_FACTS.ciWorkflowPath,
      REPOSITORY_FACTS.e2eSpecsPath,
      REPOSITORY_FACTS.messagesPath,
    ]) {
      expect(existsSync(path)).toBe(true)
    }
    expect(commands).toContain(REPOSITORY_FACTS.coverageCommand)
    expect(commands).toContain(REPOSITORY_FACTS.i18nCheckCommand)
    expect(readFileSync(REPOSITORY_FACTS.ciWorkflowPath, "utf8")).toContain(REPOSITORY_FACTS.coverageCommand)
  })

  it("reads the schedule of the full browser run from its workflow", () => {
    expect(readFileSync(".github/workflows/e2e-full.yml", "utf8")).toContain(`cron: "${REPOSITORY_FACTS.e2eFullSchedule}"`)
  })
})
