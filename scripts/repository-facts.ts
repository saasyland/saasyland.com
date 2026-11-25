import { API_BASE_PATH, API_ENDPOINT, API_ERROR_STATUS, API_HEADER, API_LIMIT, RATE_LIMIT } from "@saasyland/stack/api"
import { existsSync, globSync, readFileSync, readdirSync } from "node:fs"
import { posix } from "node:path"
import type { Plugin } from "vite-plus"
import { exactRegex } from "vite/rolldown/pluginutils"
import * as zod from "zod"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "../e2e/data/accounts.ts"
import { FLOW_FEATURE, FLOW_STATUS, type Flow } from "../e2e/data/flows.ts"
import { TEST_COURSE_LICENSE, TEST_LICENSE, TEST_LICENSED_ACCOUNT } from "../e2e/data/licenses.ts"
import playwrightConfig, { CI_RETRIES, CI_WORKERS, DEV_RETRIES, LOCAL_WORKERS } from "../playwright.config.ts"
import { MILLISECONDS_PER_SECOND } from "../src/lib/duration.ts"
import { COUNTRIES } from "../src/modules/_core/constants/country.ts"
import { CURRENCY_CODES } from "../src/modules/_core/constants/currency.ts"
import { TIMEZONES } from "../src/modules/_core/constants/timezone.ts"
import { BUNDLE_BINDING, LICENSE_API_ENDPOINTS } from "../src/modules/license/license.constants.ts"
import { type BrowserTest, FLOWS, TITLE_SEPARATOR, listBrowserTests, testLabel } from "./check-flows.ts"
import { COMMIT_EMOJIS } from "./commit-msg.ts"
import { LOCAL_ADMIN } from "./local-admin.ts"
import { ISSUE_TITLE } from "./report-updates.ts"
import { readBucketNames } from "./wrangler-config.ts"

const MODULE_ID = "virtual:repository-facts"
const RESOLVED_MODULE_ID = `\0${MODULE_ID}`
const E2E_FULL_WORKFLOW = ".github/workflows/e2e-full.yml"
const E2E_WORKFLOW = ".github/workflows/e2e-reusable.yml"
const JOURNEY_WORKFLOW = ".github/workflows/journey.yml"
const CI_WORKFLOW = ".github/workflows/ci.yml"
const UPDATES_WORKFLOW = ".github/workflows/updates.yml"
const MESSAGES_PATH = "messages/"
const AUTH_INTEGRATION_PATH = "src/integrations/better-auth"
const COVERAGE_COMMAND = "bun run test:coverage"
const FLOW_CHECK_COMMAND = "bun run check:flows"
const I18N_CHECK_COMMAND = "bun run check:i18n"
const COVERAGE_SUMMARY_REPORTER = "json-summary"
const COVERAGE_SUMMARY_FILE = "coverage-summary.json"
const CLI_CONTRACT_PACKAGE = "@saasyland/stack"
const JOURNEY_SPEC = "journey.spec.ts"
const GLOBAL_STYLESHEET = "src/presentation/styles/globals.css"
const PIXELS_PER_REM = 16
const MODULES_PATH = "src/modules"
const SERVER_FUNCTION = "createServerFn"

const BUN_PACKAGE_MANAGER = /^bun@(?<version>\S+)$/u
const WORKFLOW_CRON = /cron:\s*"(?<schedule>[^"]+)"/u
const SHARD_MATRIX = /^ +shard: \[(?<shards>[\d, ]+)\]$/mu
const BASE_RADIUS = /--radius:\s*(?<rem>[\d.]+)rem;/u
const RADIUS_STEP = /--radius-(?<step>sm|md|lg):\s*(?:calc\(var\(--radius\) \* (?<factor>[\d.]+)\)|var\(--radius\));/gu
const TABLE_DECLARATION = /sqliteTable\(\s*"(?<table>\w+)"/gu
const AUTHORIZED_CALL = /\bauthorized\((?:\{[^)]*\})?\)/u
const PERMISSION_ENTRY = /(?<resource>\w+): \[(?<actions>[^\]]*)\]/gu
const QUOTED_ACTION = /"(?<action>[\w-]+)"/gu
const SMALL_TEXT = /--text-(?<token>body-sm|spec|label):\s*(?<rem>[\d.]+)rem;/gu

const packageSchema = zod.object({ version: zod.string() })
const enginesSchema = zod.object({ engines: zod.object({ node: zod.string() }) })
const rootPackageSchema = zod.object({ packageManager: zod.string() })
const versionMatchSchema = zod.object({ version: zod.string() })
const scheduleMatchSchema = zod.object({ schedule: zod.string() })
const shardsMatchSchema = zod.object({ shards: zod.string() })
const baseRadiusSchema = zod.object({ rem: zod.coerce.number() })
const radiusStepSchema = zod.object({ factor: zod.coerce.number().default(1), step: zod.enum(["sm", "md", "lg"]) })
const radiusScaleSchema = zod.object({ lg: zod.number(), md: zod.number(), sm: zod.number() })
const smallTextSchema = zod.object({ "body-sm": zod.number(), label: zod.number(), spec: zod.number() })

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

const coverageSchema = zod
  .object({ reporter: zod.array(zod.string()), reportsDirectory: zod.string(), thresholds: thresholdsSchema })
  .refine(({ reporter }) => reporter.includes(COVERAGE_SUMMARY_REPORTER), "The landing page cites the coverage summary report")

const coverageScopeSchema = zod.object({ exclude: zod.array(zod.string()), include: zod.array(zod.string()) })

const testSchema = zod.object({ coverage: coverageSchema.and(coverageScopeSchema), projects: zod.array(zod.unknown()) })

const namedProjectSchema = zod.object({ test: zod.object({ name: zod.string() }) })

const playwrightSchema = zod.object({ testDir: zod.string() })

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

const readCliNodeEngine = (): string => enginesSchema.parse(readJson(`node_modules/${CLI_CONTRACT_PACKAGE}/package.json`)).engines.node

const readBunVersion = (): string => {
  const { packageManager } = rootPackageSchema.parse(readJson("package.json"))

  return versionMatchSchema.parse(BUN_PACKAGE_MANAGER.exec(packageManager)?.groups).version
}

const readSchedule = (path: string): string => {
  const workflow = readFileSync(path, "utf8")

  return scheduleMatchSchema.parse(WORKFLOW_CRON.exec(workflow)?.groups).schedule
}

const readShards = (path: string): number => {
  const workflow = readFileSync(path, "utf8")

  return shardsMatchSchema.parse(SHARD_MATRIX.exec(workflow)?.groups).shards.split(",").length
}

const readRadiusScale = () => {
  const stylesheet = readFileSync(GLOBAL_STYLESHEET, "utf8")
  const base = baseRadiusSchema.parse(BASE_RADIUS.exec(stylesheet)?.groups).rem * PIXELS_PER_REM
  const steps = [...stylesheet.matchAll(RADIUS_STEP)].map((match) => radiusStepSchema.parse(match.groups))

  return radiusScaleSchema.parse(Object.fromEntries(steps.map(({ factor, step }) => [step, base * factor])))
}

const readSmallText = () => {
  const stylesheet = readFileSync(GLOBAL_STYLESHEET, "utf8")

  return smallTextSchema.parse(
    Object.fromEntries(
      [...stylesheet.matchAll(SMALL_TEXT)].map((match) => [match.groups?.["token"], Number(match.groups?.["rem"]) * PIXELS_PER_REM]),
    ),
  )
}

const findTimedProject = (projects: readonly unknown[]) =>
  timedProjectSchema.parse(projects.find((project) => projectWithTimeoutSchema.safeParse(project).success))

const SERVED_API_ENDPOINTS = LICENSE_API_ENDPOINTS.map((name) => API_ENDPOINT[name])

export const collectCliApiTables = async () => ({
  bundleBuckets: await readBucketNames(BUNDLE_BINDING),
  endpoints: SERVED_API_ENDPOINTS.map(
    ({ errors, method, route, statuses }) => [`${method} ${API_BASE_PATH}${route}`, statuses.map(String), [...errors]] as const,
  ),
  errors: [...new Set(SERVED_API_ENDPOINTS.flatMap(({ errors }) => errors))].map((code) => [code, API_ERROR_STATUS[code]] as const),
})

export type CliApiTables = Awaited<ReturnType<typeof collectCliApiTables>>

export const collectSeededAccounts = () => [
  ...TEST_ACCOUNTS.map(({ email, role }) => [email, role, []] as const),
  [TEST_LICENSED_ACCOUNT.email, TEST_LICENSED_ACCOUNT.role, [TEST_LICENSE.tier]] as const,
  [TEST_COURSE_LICENSE.user.email, TEST_COURSE_LICENSE.user.role, [TEST_COURSE_LICENSE.tier]] as const,
]

export type SeededAccounts = ReturnType<typeof collectSeededAccounts>

const flowsWith = (status: Flow["status"]): number => FLOWS.filter((flow) => flow.status === status).length

const FLOW_FEATURES = Object.values(FLOW_FEATURE)

const byFeature = (first: Flow, second: Flow): number => FLOW_FEATURES.indexOf(first.feature) - FLOW_FEATURES.indexOf(second.feature)

const SORTED_FLOWS = FLOWS.toSorted(byFeature)

const coveredRow = (flow: Flow) => {
  if (flow.status !== FLOW_STATUS.COVERED) {
    return []
  }

  return [[flow.id, flow.feature, flow.outcome, flow.tests.map((test) => testLabel(test))] as const]
}

const journeyEvidence = (flow: Flow): string[] => ("journey" in flow ? [`${JOURNEY_SPEC}${TITLE_SEPARATOR}${flow.journey}`] : [])

const missingRow = (flow: Flow) => {
  if (flow.status !== FLOW_STATUS.MISSING) {
    return []
  }

  const partial = "tests" in flow ? flow.tests.map((test) => testLabel(test)) : []

  return [[flow.id, flow.feature, flow.outcome, flow.reason, [...partial, ...journeyEvidence(flow)]] as const]
}

const toBuildRow = (flow: Flow) => {
  if (flow.status !== FLOW_STATUS.TO_BUILD) {
    return []
  }

  return [[flow.id, flow.feature, flow.outcome, flow.reason] as const]
}

export const collectFlowTables = () => ({
  covered: SORTED_FLOWS.flatMap((flow) => coveredRow(flow)),
  features: FLOW_FEATURES.map((feature) => {
    const flows = FLOWS.filter((flow) => flow.feature === feature)
    const count = (status: Flow["status"]): number => flows.filter((flow) => flow.status === status).length

    return [feature, flows.length, count(FLOW_STATUS.COVERED), count(FLOW_STATUS.MISSING), count(FLOW_STATUS.TO_BUILD)] as const
  }),
  missing: SORTED_FLOWS.flatMap((flow) => missingRow(flow)),
  toBuild: SORTED_FLOWS.flatMap((flow) => toBuildRow(flow)),
})

export type FlowTables = ReturnType<typeof collectFlowTables>

interface UseCase {
  readonly check: string | undefined
  readonly module: string
  readonly name: string
  readonly serverFunction: boolean
}

const readUseCase = (module: string, path: string): UseCase => {
  const source = readFileSync(path, "utf8")

  return {
    check: AUTHORIZED_CALL.exec(source)?.[0],
    module,
    name: posix.basename(path, ".ts"),
    serverFunction: source.includes(SERVER_FUNCTION),
  }
}

const permissionsOf = (check: string): string[] =>
  [...check.matchAll(PERMISSION_ENTRY)].flatMap(({ groups }) =>
    [...(groups?.["actions"] ?? "").matchAll(QUOTED_ACTION)].map(
      (action) => `${groups?.["resource"] ?? ""}.${action.groups?.["action"] ?? ""}`,
    ),
  )

const compareText = (first: string, second: string): number => first.localeCompare(second)

export const collectModuleTables = (root = MODULES_PATH) => {
  const modules = readdirSync(root)
    .filter((module) => existsSync(posix.join(root, module, `${module}.schema.ts`)))
    .toSorted(compareText)
  const useCases = modules.flatMap((module) =>
    globSync(posix.join(root, module, "use-cases", "*.ts"))
      .toSorted(compareText)
      .map((path) => readUseCase(module, path)),
  )
  const checks = [...new Set(useCases.flatMap(({ check }) => check ?? []))].toSorted(compareText)

  return {
    checkedPermissions: [...new Set(checks.flatMap((check) => permissionsOf(check)))].toSorted(compareText),
    modules: modules.map(
      (module) =>
        [
          module,
          [...readFileSync(posix.join(root, module, `${module}.schema.ts`), "utf8").matchAll(TABLE_DECLARATION)].map(
            ({ groups }) => groups?.["table"] ?? "",
          ),
          useCases.filter((useCase) => useCase.module === module).map(({ name }) => name),
        ] as const,
    ),
    permissions: checks.map((check) => [check, useCases.filter((useCase) => useCase.check === check).map(({ name }) => name)] as const),
    plainUseCases: useCases.filter(({ serverFunction }) => !serverFunction).map(({ name }) => name),
    publicUseCases: useCases.filter(({ check, serverFunction }) => serverFunction && check === undefined).map(({ name }) => name),
  }
}

export type ModuleTables = ReturnType<typeof collectModuleTables>

export const collectRepositoryFacts = (config: unknown, browserTests: readonly BrowserTest[]) => {
  const { fmt, lint, test } = configSchema.parse(config)
  const e2eSpecsPath = posix.normalize(playwrightSchema.parse(playwrightConfig).testDir)
  const [, maxLines] = lint.rules["max-lines"]
  const [, maxLinesPerFunction] = lint.rules["max-lines-per-function"]
  const [, maxStatements] = lint.rules["max-statements"]
  const radius = readRadiusScale()
  const smallText = readSmallText()

  return {
    authIntegrationPath: AUTH_INTEGRATION_PATH,
    buildYear: new Date().getUTCFullYear(),
    bunVersion: readBunVersion(),
    ciWorkflowPath: CI_WORKFLOW,
    cliApiBasePath: API_BASE_PATH,
    cliApiBundleUrlTtlSeconds: API_LIMIT.BUNDLE_URL_TTL_SECONDS,
    cliApiLabelMaxLength: API_LIMIT.LABEL_MAX_LENGTH,
    cliApiMachineHeader: API_HEADER.MACHINE,
    cliApiRateLimitSeconds: RATE_LIMIT.PERIOD_SECONDS,
    cliApiRequestsPerAddress: RATE_LIMIT.REQUESTS_PER_ADDRESS,
    cliApiRequestsPerLicenseKey: RATE_LIMIT.REQUESTS_PER_LICENSE_KEY,
    cliNodeEngine: readCliNodeEngine(),
    countries: COUNTRIES.length,
    coverageCommand: COVERAGE_COMMAND,
    coverageSummaryPath: posix.join(test.coverage.reportsDirectory, COVERAGE_SUMMARY_FILE),
    coverageThreshold: test.coverage.thresholds.lines,
    currencies: CURRENCY_CODES.length,
    e2eFullSchedule: readSchedule(E2E_FULL_WORKFLOW),
    e2eShards: readShards(E2E_WORKFLOW),
    e2eSpecs: countFiles(`${e2eSpecsPath}/*.spec.ts`),
    e2eSpecsPath,
    e2eTests: browserTests.length,
    flowCheckCommand: FLOW_CHECK_COMMAND,
    flows: FLOWS.length,
    flowsCovered: flowsWith(FLOW_STATUS.COVERED),
    flowsInJourney: FLOWS.filter((flow) => "journey" in flow).length,
    flowsMissing: flowsWith(FLOW_STATUS.MISSING),
    flowsToBuild: flowsWith(FLOW_STATUS.TO_BUILD),
    i18nCheckCommand: I18N_CHECK_COMMAND,
    integrationTestTimeoutSeconds: findTimedProject(test.projects).test.testTimeout / MILLISECONDS_PER_SECOND,
    journeySchedule: readSchedule(JOURNEY_WORKFLOW),
    localAdminEmail: LOCAL_ADMIN.EMAIL,
    localAdminPassword: LOCAL_ADMIN.DEFAULT_PASSWORD,
    maxLines: maxLines.max,
    maxLinesPerFunction: maxLinesPerFunction.max,
    maxStatements: maxStatements.max,
    messagesPath: MESSAGES_PATH,
    nodeVersion: readFileSync(".nvmrc", "utf8").trim(),
    playwrightCiRetries: CI_RETRIES,
    playwrightCiWorkers: CI_WORKERS,
    playwrightLocalRetries: DEV_RETRIES,
    playwrightLocalWorkers: LOCAL_WORKERS,
    printWidth: fmt.printWidth,
    radiusLgPixels: radius.lg,
    radiusMdPixels: radius.md,
    radiusSmPixels: radius.sm,
    reactMajor: majorVersionOf("react"),
    tabWidth: fmt.tabWidth,
    tanstackTableMajor: majorVersionOf("@tanstack/react-table"),
    testFiles: countFiles("src/**/*.{test,spec}.{ts,tsx}"),
    testPassword: TEST_PASSWORD,
    textBodySmallPixels: smallText["body-sm"],
    textLabelPixels: smallText.label,
    textSpecPixels: smallText.spec,
    timezones: TIMEZONES.length,
    uiComponents: countFiles("src/presentation/components/shadcn/*.tsx"),
    updatesIssueTitle: ISSUE_TITLE,
    updatesSchedule: readSchedule(UPDATES_WORKFLOW),
    vitestShards: readShards(CI_WORKFLOW),
  }
}

export type RepositoryFacts = ReturnType<typeof collectRepositoryFacts>

export const collectCoverageScope = (config: unknown) => {
  const { test } = configSchema.parse(config)

  return {
    exclude: test.coverage.exclude,
    include: test.coverage.include,
    projects: test.projects.map((project) => namedProjectSchema.parse(project).test.name),
  }
}

export type CoverageScope = ReturnType<typeof collectCoverageScope>

export const repositoryFacts = (): Plugin => {
  let moduleSource = ""

  return {
    config: {
      handler: async (config) => {
        moduleSource = [
          `export default ${JSON.stringify(collectRepositoryFacts(config, listBrowserTests()))}`,
          `export const commitEmojis = ${JSON.stringify(COMMIT_EMOJIS)}`,
          `export const cliApiTables = ${JSON.stringify(await collectCliApiTables())}`,
          `export const seededAccounts = ${JSON.stringify(collectSeededAccounts())}`,
          `export const flowTables = ${JSON.stringify(collectFlowTables())}`,
          `export const coverageScope = ${JSON.stringify(collectCoverageScope(config))}`,
          `export const moduleTables = ${JSON.stringify(collectModuleTables())}`,
        ].join("\n")
      },
      order: "pre",
    },
    enforce: "pre",
    load: { filter: { id: exactRegex(RESOLVED_MODULE_ID) }, handler: () => moduleSource },
    name: "saasyland:repository-facts",
    resolveId: { filter: { id: exactRegex(MODULE_ID) }, handler: () => RESOLVED_MODULE_ID },
  }
}
