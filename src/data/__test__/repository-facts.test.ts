import { API_BASE_PATH, API_HEADER, API_LIMIT, RATE_LIMIT } from "@saasyland/stack/api"
import { existsSync, readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "~/e2e/data/accounts"
import { FLOW_AREA, FLOW_STATUS } from "~/e2e/data/flows"
import { TEST_COURSE_LICENSE, TEST_LICENSE, TEST_LICENSED_ACCOUNT } from "~/e2e/data/licenses"
import packageJson from "~/package.json"
import { FLOWS } from "~/scripts/check-flows"
import { collectCoverageScope, collectFlowTables, collectRepositoryFacts, collectSeededAccounts } from "~/scripts/repository-facts"

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
    coverage: {
      exclude: ["src/generated/**"],
      include: ["src/**/*.ts"],
      reporter,
      reportsDirectory: "./reports",
      thresholds: { branches: 90, functions: 90, lines, statements: 90 },
    },
    projects: [{ test: { name: "node" } }, { test: { hookTimeout, name: "integration", testTimeout: 4000 } }],
  },
})

afterEach(() => {
  vi.useRealTimers()
})

describe("collectRepositoryFacts", () => {
  it("takes the year the build runs in, in UTC, so every machine prints the same year", () => {
    vi.useFakeTimers({ now: new Date("2032-01-01T01:00:00Z"), toFake: ["Date"] })
    expect(collectRepositoryFacts(configWith(), []).buildYear).toBe(2032)
  })

  it("reads the coverage threshold, lint limits, formatter widths and test timeout from the Vite config", () => {
    expect(collectRepositoryFacts(configWith(), [])).toMatchObject({
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
    expect(collectRepositoryFacts(configWith(), [])).toMatchObject({
      cliApiBasePath: API_BASE_PATH,
      cliApiBundleUrlTtlSeconds: API_LIMIT.BUNDLE_URL_TTL_SECONDS,
      cliApiLabelMaxLength: API_LIMIT.LABEL_MAX_LENGTH,
      cliApiMachineHeader: API_HEADER.MACHINE,
      cliApiRateLimitSeconds: RATE_LIMIT.PERIOD_SECONDS,
      cliApiRequestsPerAddress: RATE_LIMIT.REQUESTS_PER_ADDRESS,
      cliApiRequestsPerLicenseKey: RATE_LIMIT.REQUESTS_PER_LICENSE_KEY,
    })
  })

  it("counts the browser tests that Playwright lists", () => {
    const tests = [
      { skipped: false, spec: "a.spec.ts", title: "one" },
      { skipped: true, spec: "a.spec.ts", title: "two" },
    ]

    expect(collectRepositoryFacts(configWith(), tests).e2eTests).toBe(2)
  })

  it("counts the flows of the inventory by status, and the missing ones the journey suite performs", () => {
    const facts = collectRepositoryFacts(configWith(), [])

    expect(facts.flows).toBe(FLOWS.length)
    expect(facts.flowsCovered + facts.flowsMissing + facts.flowsToBuild).toBe(facts.flows)
    expect(facts.flowsCovered).toBe(FLOWS.filter(({ status }) => status === FLOW_STATUS.COVERED).length)
    expect(facts.flowsToBuild).toBe(FLOWS.filter(({ status }) => status === FLOW_STATUS.TO_BUILD).length)
    expect(facts.flowsInJourney).toBe(FLOWS.filter((flow) => "journey" in flow).length)
  })

  it("prints the password of the seeded accounts from the browser test data", () => {
    expect(collectRepositoryFacts(configWith(), []).testPassword).toBe(TEST_PASSWORD)
  })

  it("finds the coverage summary in the configured reports directory", () => {
    expect(collectRepositoryFacts(configWith(), []).coverageSummaryPath).toBe("reports/coverage-summary.json")
  })

  it("refuses a coverage configuration that does not write the summary the landing page cites", () => {
    expect(() => collectRepositoryFacts(configWith({ reporter: ["text"] }), [])).toThrow("coverage summary report")
  })

  it("refuses coverage thresholds that the docs could not state as one number", () => {
    expect(() => collectRepositoryFacts(configWith({ lines: 95 }), [])).toThrow("one coverage threshold")
  })

  it("refuses test and hook timeouts that the docs could not state as one duration", () => {
    expect(() => collectRepositoryFacts(configWith({ hookTimeout: 8000 }), [])).toThrow("one timeout")
  })
})

describe("collectSeededAccounts", () => {
  it("lists every account the test seed creates once, with its role", () => {
    const accounts = collectSeededAccounts()

    expect(accounts.map(([email, role]) => ({ email, role }))).toStrictEqual(
      [...TEST_ACCOUNTS, TEST_LICENSED_ACCOUNT, TEST_COURSE_LICENSE.user].map(({ email, role }) => ({ email, role })),
    )
    expect(new Set(accounts.map(([email]) => email)).size).toBe(accounts.length)
  })

  it("names the tier of the seeded licence beside the licensed account only", () => {
    const tiers = new Map(collectSeededAccounts().map(([email, , licensed]) => [email, licensed]))

    expect(tiers.get(TEST_LICENSED_ACCOUNT.email)).toStrictEqual([TEST_LICENSE.tier])
    expect(tiers.get(TEST_COURSE_LICENSE.user.email)).toStrictEqual([TEST_COURSE_LICENSE.tier])
    for (const { email } of TEST_ACCOUNTS) {
      expect(tiers.get(email)).toStrictEqual([])
    }
  })
})

describe("collectCoverageScope", () => {
  it("names the files the coverage gate measures and leaves out, and the Vitest projects whose tests count toward it", () => {
    expect(collectCoverageScope(configWith())).toStrictEqual({
      exclude: ["src/generated/**"],
      include: ["src/**/*.ts"],
      projects: ["node", "integration"],
    })
  })
})

describe("collectFlowTables", () => {
  it("puts every flow in the table of its status once, grouped by area", () => {
    const { covered, missing, toBuild } = collectFlowTables()
    const areas = Object.values(FLOW_AREA)
    const rows = [...covered, ...missing, ...toBuild]

    expect(rows.map(([id]) => id).toSorted()).toStrictEqual(FLOWS.map(({ id }) => id).toSorted())
    for (const table of [covered, missing, toBuild]) {
      const order = table.map(([, area]) => areas.indexOf(area))
      expect(order).toStrictEqual(order.toSorted((first, second) => first - second))
    }
  })

  it("names the tests that prove a covered flow and the partial evidence of a missing one", () => {
    const { covered, missing } = collectFlowTables()

    expect(covered).toContainEqual([
      "sign-up-and-verify",
      FLOW_AREA.ACCOUNT,
      expect.any(String),
      ["auth.spec.ts › auth › signs a new account in straight away, and its link confirms the address"],
    ])
    expect(missing).toContainEqual([
      "refund-revokes",
      FLOW_AREA.AFTER_SALE,
      expect.any(String),
      expect.any(String),
      [
        "checkout-funnel.spec.ts › checkout funnel › a refunded licence says so without its key, commands or a pending key, and offers a new one",
        "journey.spec.ts › a refund in the Polar sandbox stops the key and removes the credentials",
      ],
    ])
  })

  it("counts each area's flows by status", () => {
    const { areas } = collectFlowTables()

    expect(areas.map(([area]) => area)).toStrictEqual(Object.values(FLOW_AREA))
    for (const [area, total, covered, missing, toBuild] of areas) {
      expect(covered + missing + toBuild).toBe(total)
      expect(total).toBe(FLOWS.filter((flow) => flow.area === area).length)
    }
  })
})

describe("REPOSITORY_FACTS", () => {
  it("counts at least one browser test in every spec file", () => {
    expect(REPOSITORY_FACTS.e2eTests).toBeGreaterThanOrEqual(REPOSITORY_FACTS.e2eSpecs)
  })

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
    expect(commands).toContain(REPOSITORY_FACTS.flowCheckCommand)
    expect(packageJson.scripts.check).toContain(REPOSITORY_FACTS.flowCheckCommand)
    expect(readFileSync(REPOSITORY_FACTS.ciWorkflowPath, "utf8")).toContain(REPOSITORY_FACTS.coverageCommand)
  })

  it("reads the schedule of the full browser run from its workflow", () => {
    expect(readFileSync(".github/workflows/e2e-full.yml", "utf8")).toContain(`cron: "${REPOSITORY_FACTS.e2eFullSchedule}"`)
  })

  it("counts the shards the browser suite runs on from its workflow's matrix", () => {
    const shards = Array.from({ length: REPOSITORY_FACTS.e2eShards }, (_, index) => index + 1)

    expect(readFileSync(".github/workflows/e2e-reusable.yml", "utf8")).toContain(`shard: [${shards.join(", ")}]`)
  })
})
