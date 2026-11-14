import { API_BASE_PATH, API_ENDPOINT, API_ERROR_STATUS, API_HEADER, API_LIMIT, RATE_LIMIT } from "@saasyland/stack/api"
import { globSync, readFileSync } from "node:fs"
import type { Plugin } from "vite-plus"
import * as zod from "zod"

import { CI_RETRIES, CI_WORKERS, DEV_RETRIES, LOCAL_WORKERS } from "../playwright.config.ts"
import { MILLISECONDS_PER_SECOND } from "../src/lib/duration.ts"
import { COUNTRIES } from "../src/modules/_core/constants/country.ts"
import { CURRENCY_CODES } from "../src/modules/_core/constants/currency.ts"
import { TIMEZONES } from "../src/modules/_core/constants/timezone.ts"
import { LICENSE_API_ENDPOINTS } from "../src/modules/license/license.constants.ts"
import { COMMIT_EMOJIS } from "./commit-msg.ts"

const MODULE_ID = "virtual:repository-facts"
const RESOLVED_MODULE_ID = `\0${MODULE_ID}`
const E2E_FULL_WORKFLOW = ".github/workflows/e2e-full.yml"

const BUN_PACKAGE_MANAGER = /^bun@(?<version>\S+)$/u
const WORKFLOW_CRON = /cron:\s*"(?<schedule>[^"]+)"/u

const packageSchema = zod.object({ version: zod.string() })
const rootPackageSchema = zod.object({ packageManager: zod.string() })
const versionMatchSchema = zod.object({ version: zod.string() })
const scheduleMatchSchema = zod.object({ schedule: zod.string() })

const maxRuleSchema = zod.tuple([zod.string(), zod.object({ max: zod.number() })])

const thresholdsSchema = zod
  .object({ branches: zod.number(), functions: zod.number(), lines: zod.number(), statements: zod.number() })
  .refine(
    ({ branches, functions, lines, statements }) => [branches, functions, statements].every((threshold) => threshold === lines),
    "The docs state one coverage threshold for all four metrics",
  )

const timeoutsSchema = zod
  .object({ hookTimeout: zod.number(), testTimeout: zod.number() })
  .refine(({ hookTimeout, testTimeout }) => hookTimeout === testTimeout, "The docs state one timeout for integration tests and hooks")

const timedProjectSchema = zod.object({ test: timeoutsSchema })

const projectWithTimeoutSchema = zod.object({ test: zod.object({ testTimeout: zod.number() }) })

const rulesSchema = zod.object({ "max-lines": maxRuleSchema, "max-lines-per-function": maxRuleSchema, "max-statements": maxRuleSchema })

const testSchema = zod.object({ coverage: zod.object({ thresholds: thresholdsSchema }), projects: zod.array(zod.unknown()) })

const configSchema = zod.object({
  fmt: zod.object({ printWidth: zod.number(), tabWidth: zod.number() }),
  lint: zod.object({ rules: rulesSchema }),
  test: testSchema,
})

const countFiles = (pattern: string): number => globSync(pattern).length

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"))

const majorVersionOf = (packageName: string): number => {
  const [major] = packageSchema.parse(readJson(`node_modules/${packageName}/package.json`)).version.split(".")

  return Number(major)
}

const readBunVersion = (): string => {
  const { packageManager } = rootPackageSchema.parse(readJson("package.json"))

  return versionMatchSchema.parse(BUN_PACKAGE_MANAGER.exec(packageManager)?.groups).version
}

const readE2eFullSchedule = (): string => {
  const workflow = readFileSync(E2E_FULL_WORKFLOW, "utf8")

  return scheduleMatchSchema.parse(WORKFLOW_CRON.exec(workflow)?.groups).schedule
}

const findTimedProject = (projects: readonly unknown[]) =>
  timedProjectSchema.parse(projects.find((project) => projectWithTimeoutSchema.safeParse(project).success))

const SERVED_API_ENDPOINTS = LICENSE_API_ENDPOINTS.map((name) => API_ENDPOINT[name])

export const collectCliApiTables = () => ({
  endpoints: SERVED_API_ENDPOINTS.map(
    ({ errors, method, route, statuses }) => [`${method} ${API_BASE_PATH}${route}`, statuses.map(String), [...errors]] as const,
  ),
  errors: [...new Set(SERVED_API_ENDPOINTS.flatMap(({ errors }) => errors))].map((code) => [code, API_ERROR_STATUS[code]] as const),
})

export type CliApiTables = ReturnType<typeof collectCliApiTables>

export const collectRepositoryFacts = (config: unknown) => {
  const { fmt, lint, test } = configSchema.parse(config)
  const [, maxLines] = lint.rules["max-lines"]
  const [, maxLinesPerFunction] = lint.rules["max-lines-per-function"]
  const [, maxStatements] = lint.rules["max-statements"]

  return {
    bunVersion: readBunVersion(),
    cliApiBasePath: API_BASE_PATH,
    cliApiLabelMaxLength: API_LIMIT.LABEL_MAX_LENGTH,
    cliApiMachineHeader: API_HEADER.MACHINE,
    cliApiRateLimitSeconds: RATE_LIMIT.PERIOD_SECONDS,
    cliApiRequestsPerAddress: RATE_LIMIT.REQUESTS_PER_ADDRESS,
    cliApiRequestsPerLicenseKey: RATE_LIMIT.REQUESTS_PER_LICENSE_KEY,
    countries: COUNTRIES.length,
    coverageThreshold: test.coverage.thresholds.lines,
    currencies: CURRENCY_CODES.length,
    e2eFullSchedule: readE2eFullSchedule(),
    e2eSpecs: countFiles("e2e/specs/*.spec.ts"),
    integrationTestTimeoutSeconds: findTimedProject(test.projects).test.testTimeout / MILLISECONDS_PER_SECOND,
    maxLines: maxLines.max,
    maxLinesPerFunction: maxLinesPerFunction.max,
    maxStatements: maxStatements.max,
    nodeVersion: readFileSync(".nvmrc", "utf8").trim(),
    playwrightCiRetries: CI_RETRIES,
    playwrightCiWorkers: CI_WORKERS,
    playwrightLocalRetries: DEV_RETRIES,
    playwrightLocalWorkers: LOCAL_WORKERS,
    printWidth: fmt.printWidth,
    reactMajor: majorVersionOf("react"),
    tabWidth: fmt.tabWidth,
    tanstackTableMajor: majorVersionOf("@tanstack/react-table"),
    testFiles: countFiles("src/**/*.{test,spec}.{ts,tsx}"),
    timezones: TIMEZONES.length,
    uiComponents: countFiles("src/presentation/components/shadcn/*.tsx"),
  }
}

export type RepositoryFacts = ReturnType<typeof collectRepositoryFacts>

export const repositoryFacts = (): Plugin => {
  let moduleSource = ""

  return {
    config: (config) => {
      moduleSource = [
        `export default ${JSON.stringify(collectRepositoryFacts(config))}`,
        `export const commitEmojis = ${JSON.stringify(COMMIT_EMOJIS)}`,
        `export const cliApiTables = ${JSON.stringify(collectCliApiTables())}`,
      ].join("\n")
    },
    load: (id) => (id === RESOLVED_MODULE_ID ? moduleSource : undefined),
    name: "saasyland:repository-facts",
    resolveId: (id) => (id === MODULE_ID ? RESOLVED_MODULE_ID : undefined),
  }
}
