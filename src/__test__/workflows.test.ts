import { globSync, readFileSync } from "node:fs"
import { posix } from "node:path"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { importClosure } from "~/src/platform/testing/lib/import-closure"

import { DEPLOYED_HOSTS, ENVIRONMENT } from "~/src/modules/_core/constants/api"
import { LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { POLAR_SERVER } from "~/src/data/polar"

import { REPORT_MODE } from "~/scripts/report-updates"

const REMOTION_WORKFLOW = ".github/workflows/remotion.yml"
const DEPLOY_WORKFLOW = ".github/workflows/deploy-reusable.yml"
const E2E_WORKFLOW = ".github/workflows/e2e-reusable.yml"
const E2E_FULL_WORKFLOW = ".github/workflows/e2e-full.yml"
const CI_WORKFLOW = ".github/workflows/ci.yml"
const MAIN_WORKFLOW = ".github/workflows/deploy.yml"
const PREVIEW_WORKFLOW = ".github/workflows/preview.yml"
const JOURNEY_WORKFLOW = ".github/workflows/journey.yml"
const UPDATES_WORKFLOW = ".github/workflows/updates.yml"
const JOURNEY_SETTINGS_FILE = "e2e/journey/settings.ts"
const SETUP_ACTION = ".github/actions/setup/action.yml"
const REMOTION = readFileSync(REMOTION_WORKFLOW, "utf8")
const DEPLOY = readFileSync(DEPLOY_WORKFLOW, "utf8")
const E2E = readFileSync(E2E_WORKFLOW, "utf8")
const E2E_FULL = readFileSync(E2E_FULL_WORKFLOW, "utf8")
const CI = readFileSync(CI_WORKFLOW, "utf8")
const MAIN = readFileSync(MAIN_WORKFLOW, "utf8")
const PREVIEW = readFileSync(PREVIEW_WORKFLOW, "utf8")
const JOURNEY = readFileSync(JOURNEY_WORKFLOW, "utf8")
const UPDATES = readFileSync(UPDATES_WORKFLOW, "utf8")
const JOURNEY_SETTINGS = readFileSync(JOURNEY_SETTINGS_FILE, "utf8")
const JOURNEY_SPEC = readFileSync("e2e/journey/journey.spec.ts", "utf8")
const SETUP = readFileSync(SETUP_ACTION, "utf8")
const E2E_SHARDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const TEST_SHARDS = [1, 2, 3, 4]
const JOBS_SECTION = "\njobs:\n"
const TRIGGERS_SECTION = /^on:\n(?<triggers>(?: {2}.+\n| {4}.+\n)+)/mu
const QUEUED = ["cancel-in-progress: false", "queue: max"]
const WHOLE_COMMIT_HISTORY = ["fetch-depth: 0", "filter: tree:0"]
const REMOTION_PATHS = "remotion/**"
const REMOTION_SOURCES = "remotion/src/**/*.{ts,tsx}"

const expression = (body: string): string => `\${{ ${body} }}`

const BROWSER = expression("inputs.browser")
const TEST_WORKER_ARTIFACT = `name: test-worker-${BROWSER}`
const BLOB_REPORT_ARTIFACT = `name: blob-report-${BROWSER}-${expression("matrix.shard")}`
const AGGREGATE_CHECK = `name: Build and E2E (${BROWSER})`
const SHARD_COMMAND = `bunx playwright test e2e/specs --project=${BROWSER} --shard=${expression("matrix.shard")}/${expression("strategy.job-total")}`
const REQUIRED_CHECK = "name: Format, lint, types, i18n, tests"
const BUILD_JOB = `Build the test Worker (${BROWSER})`
const BUILD_STEP = "Upload the test build"
const BUILD_ARTIFACT = `BUILD_ARTIFACT: test-worker-${BROWSER}`
const WAIT_FOR_BUILD = 'run: bun scripts/download-artifact.ts "$BUILD_JOB" "$BUILD_STEP" "$BUILD_ARTIFACT" test-worker.zip'
const UNZIP_BUILD = "unzip -q test-worker.zip"
const ACTIONS_READ = "\n      actions: read\n"
const JOBS_WITH_ACTIONS_READ = 4
const TEST_SHARD_COMMAND = `bun run test:coverage\n          --shard=${expression("matrix.shard")}/${expression("strategy.job-total")}\n          --reporter=default --reporter=blob`
const TEST_BLOB_ARTIFACT = `name: vitest-blob-${expression("matrix.shard")}`
const MERGE_COMMAND = "run: bun run test:coverage --merge-reports"
const UNLESS_CANCELLED = `if: ${expression("!cancelled()")}`
const UNLESS_UPLOAD = `if: ${expression("!inputs.upload")}`
const DEPLOYMENT_UNLESS_UPLOAD = `deployment: ${expression("!inputs.upload")}`
const UPLOAD_CONCURRENCY = `group: cloudflare-${expression("inputs.upload && format('upload-{0}', github.run_id) || format('deploy-{0}', inputs.target)")}`
const UPLOAD_SKIPPED_STEPS = 2
const UNTESTED = "if: needs.tested.outputs.tested != 'true'"
const TESTED_OR_CHECKED = "(needs.tested.outputs.tested == 'true' || needs.checks.result == 'success')"
const AFTER_PREVIEW = `if: ${expression("!cancelled() && needs.deploy-preview.result == 'success'")}`
const PULL_REQUEST_CANCELLATION = `cancel-in-progress: ${expression("github.event_name == 'pull_request'")}`

const ALL_JOURNEYS = "all"
const WEEKLY_SCHEDULE = /^ {4}- cron: "\d+ \d+ \* \* [0-6]"\n/mu
const UPDATES_FILE = '"$RUNNER_TEMP/updates.json"'
const ISSUE_PERMISSIONS = "\npermissions:\n  contents: read\n  issues: write\n\n"
const UPGRADE_JOURNEY = "upgrade"
const JOURNEY_FILTER = 'filter=(--grep "@$JOURNEY")'
const JOURNEY_SUMMARY = 'run: bun scripts/journey-summary.ts playwright-report/journey.json >> "$GITHUB_STEP_SUMMARY"'
const SETTINGS_SCHEMA = /const settingsSchema = zod\.object\(\{\n(?<keys>(?: {2}.+\n)+)\}\)/u
const SETTING_KEY = /^ {2}(?<name>[A-Z_]+):/gmu
const JOURNEY_TAG = /const journeyTag = \(journey: Journey\): string => `@\$\{journey\}`/u
const DISPATCH_OPTIONS = /options:\n(?<options>(?: {10}- .+\n)+)/u
const TRIGGER_PATHS = /paths:\n(?<entries>(?: +- "[^"]+"\n)+)/gu
const TRIGGER_PATH = /"(?<path>[^"]+)"/gu
const CHECKOUT_OPTIONS = /uses: actions\/checkout@v\d+\n +with:\n(?<options>(?: {10}[\w-]+: .+\n)+)/gu
const CHOOSE_RELEASE_TAG =
  /- name: Choose the release tag\n +id: release-tag\n +if: inputs\.target == 'production'\n +run: bun scripts\/choose-release-tag\.ts "\$GITHUB_SHA" >> "\$GITHUB_OUTPUT"\n/u
const BUILD_WITH_RELEASE_TAG =
  /- name: Build Worker and verify artifacts\n +env:\n +RELEASE_TAG: \$\{\{ steps\.release-tag\.outputs\.tag \}\}\n/u
const DEPLOY_JOB_RELEASE_TAG = /\n {4}outputs:\n {6}release-tag: \$\{\{ steps\.release-tag\.outputs\.tag \}\}\n/u
const WORKFLOW_RELEASE_TAG =
  /\n {4}outputs:\n {6}release-tag:\n {8}description: .+\n {8}value: \$\{\{ jobs\.deploy\.outputs\.release-tag \}\}\n/u
const PUBLISH_RELEASE_TAG =
  /RELEASE_TAG: \$\{\{ needs\.deploy-production\.outputs\.release-tag \}\}\n +run: bun scripts\/publish-release\.ts "\$GITHUB_SHA" "\$RELEASE_TAG"\n/u
const JOB_HEADER = /^ {2}(?<id>[\w-]+):\n/gmu
const WORKFLOW_CONCURRENCY = /^concurrency:\n(?<settings>(?: {2}.+\n)+)/mu
const SHARD_MATRIX = /matrix:\n +shard: \[(?<shards>[\d, ]+)\]\n/u
const ENVIRONMENT_URL = /url: \$\{\{ inputs\.target == '(?<target>[^']+)' && '(?<targetUrl>[^']+)' \|\| '(?<fallbackUrl>[^']+)' \}\}/u

const entriesSchema = zod.object({ entries: zod.string() })
const pathSchema = zod.object({ path: zod.string() })
const triggerListsSchema = zod.tuple([zod.array(zod.string()), zod.array(zod.string())])
const checkoutOptionsSchema = zod.object({ options: zod.string() })
const environmentUrlSchema = zod.object({ fallbackUrl: zod.string(), target: zod.string(), targetUrl: zod.string() })
const jobHeaderSchema = zod.object({ id: zod.string() })
const concurrencySchema = zod.object({ settings: zod.string() })
const shardMatrixSchema = zod.object({ shards: zod.string() })
const triggersSchema = zod.object({ triggers: zod.string() })
const settingKeysSchema = zod.object({ keys: zod.string() })
const settingNameSchema = zod.object({ name: zod.string() })
const dispatchOptionsSchema = zod.object({ options: zod.string() })

const JOURNEY_SETTING_NAMES = [...settingKeysSchema.parse(SETTINGS_SCHEMA.exec(JOURNEY_SETTINGS)?.groups).keys.matchAll(SETTING_KEY)].map(
  (key) => settingNameSchema.parse(key.groups).name,
)
const JOURNEY_SECRET_NAMES = JOURNEY_SETTING_NAMES.filter((name) => name !== "POLAR_SERVER")

const dispatchOptionsOf = (workflow: string): string[] =>
  dispatchOptionsSchema
    .parse(DISPATCH_OPTIONS.exec(workflow)?.groups)
    .options.trim()
    .split("\n")
    .map((option) => option.replace("- ", "").trim())

const listedPaths = (entries: string): string[] => [...entries.matchAll(TRIGGER_PATH)].map((entry) => pathSchema.parse(entry.groups).path)

const triggerPaths = (workflow: string) =>
  triggerListsSchema.parse([...workflow.matchAll(TRIGGER_PATHS)].map((list) => listedPaths(entriesSchema.parse(list.groups).entries)))

const [PULL_REQUEST_PATHS, PUSH_PATHS] = triggerPaths(REMOTION)
const WORKFLOW_OWN_PATHS = [REMOTION_PATHS, REMOTION_WORKFLOW]
const WEBSITE_PATHS = PULL_REQUEST_PATHS.filter((glob) => !WORKFLOW_OWN_PATHS.includes(glob))
const IMPORTED_WEBSITE_FILES = importClosure(globSync(REMOTION_SOURCES)).filter((file) => !posix.matchesGlob(file, REMOTION_PATHS))

const optionsOf = (checkout: RegExpExecArray): string[] =>
  checkoutOptionsSchema
    .parse(checkout.groups)
    .options.trim()
    .split("\n")
    .map((option) => option.trim())

const checkoutsOf = (workflow: string): string[][] => [...workflow.matchAll(CHECKOUT_OPTIONS)].map((checkout) => optionsOf(checkout))

const jobsOf = (workflow: string): ReadonlyMap<string, string> => {
  const jobs = workflow.slice(workflow.indexOf(JOBS_SECTION))
  const headers = [...jobs.matchAll(JOB_HEADER)]

  return new Map(
    headers.map((header, index) => [jobHeaderSchema.parse(header.groups).id, jobs.slice(header.index, headers[index + 1]?.index)]),
  )
}

const jobOf = (workflow: string, id: string): string => zod.string().parse(jobsOf(workflow).get(id))

const concurrencyOf = (workflow: string): string[] =>
  concurrencySchema
    .parse(WORKFLOW_CONCURRENCY.exec(workflow)?.groups)
    .settings.trim()
    .split("\n")
    .map((setting) => setting.trim())

const triggersOf = (workflow: string): string[] =>
  triggersSchema
    .parse(TRIGGERS_SECTION.exec(workflow)?.groups)
    .triggers.split("\n")
    .filter((line) => line.startsWith("  ") && !line.startsWith("    "))
    .map((line) => line.trim())

const shardsOf = (workflow: string): number[] => shardMatrixSchema.parse(SHARD_MATRIX.exec(workflow)?.groups).shards.split(",").map(Number)

const isWatched = (file: string): boolean => WEBSITE_PATHS.some((glob) => posix.matchesGlob(file, glob))
const isImported = (glob: string): boolean => IMPORTED_WEBSITE_FILES.some((file) => posix.matchesGlob(file, glob))

describe(REMOTION_WORKFLOW, () => {
  it("runs on the same paths for pull requests and pushes to main", () => {
    expect(PUSH_PATHS).toStrictEqual(PULL_REQUEST_PATHS)
  })

  it("runs when remotion/ or the workflow itself changes", () => {
    expect(PULL_REQUEST_PATHS).toEqual(expect.arrayContaining(WORKFLOW_OWN_PATHS))
  })

  it("runs when a website file that remotion/src imports changes, directly or through other website files", () => {
    expect(IMPORTED_WEBSITE_FILES.filter((file) => !isWatched(file))).toStrictEqual([])
  })

  it("watches no website path that remotion/src does not import", () => {
    expect(WEBSITE_PATHS.filter((glob) => !isImported(glob))).toStrictEqual([])
  })
})

describe(DEPLOY_WORKFLOW, () => {
  it("links each GitHub environment to its host in DEPLOYED_HOSTS", () => {
    const urls = environmentUrlSchema.parse(ENVIRONMENT_URL.exec(DEPLOY)?.groups)

    expect(urls).toStrictEqual({
      fallbackUrl: `https://${DEPLOYED_HOSTS[ENVIRONMENT.PREVIEW]}`,
      target: ENVIRONMENT.PRODUCTION,
      targetUrl: `https://${DEPLOYED_HOSTS[ENVIRONMENT.PRODUCTION]}`,
    })
  })
})

describe("checkouts that read the changelog", () => {
  it.each([
    { checkouts: checkoutsOf(jobOf(E2E, "build")), job: `the build in ${E2E_WORKFLOW}` },
    { checkouts: checkoutsOf(jobOf(E2E, "shard")), job: `the shards in ${E2E_WORKFLOW}, whose content spec reads the changelog` },
    { checkouts: checkoutsOf(DEPLOY), job: `the build in ${DEPLOY_WORKFLOW}` },
    { checkouts: checkoutsOf(jobOf(MAIN, "release")), job: `the release job in ${MAIN_WORKFLOW}` },
  ])("fetch every commit without its trees for $job, which dates the changelog entries", ({ checkouts }) => {
    expect(checkouts).toHaveLength(1)
    expect(checkouts.flat()).toEqual(expect.arrayContaining(WHOLE_COMMIT_HISTORY))
  })
})

describe(E2E_WORKFLOW, () => {
  it("builds the test Worker once and hands the build and its seeded state to the shards", () => {
    const build = jobOf(E2E, "build")
    const shard = jobOf(E2E, "shard")

    expect(build).toContain("run: bun run db:reset:test")
    expect(build).toContain("run: bun run build:test")
    expect(build).toContain("git tag --list | LC_ALL=C sort > test-worker.tags")
    expect(build).toContain("tar --zstd --create --file test-worker.tar.zst dist .wrangler/deploy .wrangler/test test-worker.tags")
    expect(build).toContain(TEST_WORKER_ARTIFACT)
    expect(shard).toContain(BUILD_ARTIFACT)
    expect(shard).not.toContain("build:test")
  })

  it("starts the shards beside the build and has each one wait for the build's upload only once its browser is installed", () => {
    const shard = jobOf(E2E, "shard")

    expect(shard).not.toContain("needs:")
    expect(jobOf(E2E, "build")).toContain(`name: ${BUILD_JOB}`)
    expect(jobOf(E2E, "build")).toContain(`- name: ${BUILD_STEP}\n        uses: actions/upload-artifact@v`)
    expect(shard).toContain(`BUILD_JOB: ${BUILD_JOB}`)
    expect(shard).toContain(`BUILD_STEP: ${BUILD_STEP}`)
    expect(shard).toContain(WAIT_FOR_BUILD)
    expect(shard.indexOf("bunx playwright install")).toBeLessThan(shard.indexOf(WAIT_FOR_BUILD))
    expect(shard.indexOf(WAIT_FOR_BUILD)).toBeLessThan(shard.indexOf(UNZIP_BUILD))
  })

  it("has the wait download the build itself, so no other step can ask for it before GitHub serves it", () => {
    const shard = jobOf(E2E, "shard")

    expect(shard).not.toContain("actions/download-artifact")
    expect(shard).toContain("rm test-worker.zip test-worker.tar.zst test-worker.tags")
  })

  it("gives only the shards actions: read, which the wait needs to read the run's jobs, and every caller grants it", () => {
    expect(jobOf(E2E, "shard")).toContain(ACTIONS_READ)
    expect(jobOf(E2E, "build")).not.toContain(ACTIONS_READ)
    expect(jobOf(E2E, "report")).not.toContain(ACTIONS_READ)
    expect(jobOf(CI, "e2e")).toContain(ACTIONS_READ)
    expect(jobOf(E2E_FULL, "e2e")).toContain(ACTIONS_READ)
    expect(jobOf(MAIN, "checks")).toContain(ACTIONS_READ)
    expect([CI, E2E_FULL, MAIN, E2E].join("\n").split(ACTIONS_READ)).toHaveLength(JOBS_WITH_ACTIONS_READ + 1)
  })

  it("gives the shards the release tags the build read, so a release tagged in between cannot change the changelog they expect", () => {
    expect(jobOf(E2E, "shard")).toContain(
      "git tag --list | LC_ALL=C sort | comm -13 test-worker.tags - | xargs --no-run-if-empty git tag --delete",
    )
  })

  it("splits the browser suite across ten shards that each run their part", () => {
    expect(shardsOf(E2E)).toStrictEqual(E2E_SHARDS)
    expect(jobOf(E2E, "shard")).toContain(`run: ${SHARD_COMMAND}`)
    expect(jobOf(E2E, "shard")).toContain("fail-fast: false")
  })

  it("reports one check per browser that needs the build and every shard and fails unless both passed", () => {
    const report = jobOf(E2E, "report")

    expect(report).toContain(AGGREGATE_CHECK)
    expect(report).toContain("needs: [build, shard]")
    expect(report).toContain(UNLESS_CANCELLED)
    expect(report).toContain('if [[ "$BUILD_RESULT" != "success" || "$SHARD_RESULT" != "success" ]]; then')
  })

  it("merges the shards' blob reports into one HTML report when a shard fails", () => {
    expect(jobOf(E2E, "shard")).toContain(BLOB_REPORT_ARTIFACT)
    expect(jobOf(E2E, "report")).toContain("run: bunx playwright merge-reports --reporter html all-blob-reports")
  })
})

describe("workflow concurrency", () => {
  it(`cancels a superseded pull request run in ${CI_WORKFLOW} and nothing else`, () => {
    expect(concurrencyOf(CI)).toContain(PULL_REQUEST_CANCELLATION)
    expect(concurrencyOf(CI)).not.toContain("queue: max")
  })

  it.each([
    { path: MAIN_WORKFLOW, workflow: MAIN },
    { path: E2E_FULL_WORKFLOW, workflow: E2E_FULL },
  ])("queues every run of $path on main instead of cancelling one", ({ workflow }) => {
    expect(concurrencyOf(workflow)).toEqual(expect.arrayContaining(QUEUED))
  })

  it(`never cancels a run of ${PREVIEW_WORKFLOW}`, () => {
    expect(concurrencyOf(PREVIEW)).toContain("cancel-in-progress: false")
  })
})

describe(CI_WORKFLOW, () => {
  it("runs on pull requests and on the merge queue's groups, which must report every required check", () => {
    expect(triggersOf(CI)).toStrictEqual(["pull_request:", "merge_group:", "workflow_call:"])
  })

  it("runs the format, lint, type and i18n checks in a job of their own, beside the test shards", () => {
    expect(jobOf(CI, "check")).toContain("run: bun run check")
    expect(jobOf(CI, "check")).not.toContain("needs:")
  })

  it("splits the tests with coverage across four shards that each upload a blob report", () => {
    const test = jobOf(CI, "test")

    expect(shardsOf(test)).toStrictEqual(TEST_SHARDS)
    expect(test).toContain("fail-fast: false")
    expect(test).toContain(TEST_SHARD_COMMAND)
    expect(test).toContain(TEST_BLOB_ARTIFACT)
    expect(test).toContain("if-no-files-found: error")
  })

  it("reports the required check from one job that merges the shards' coverage under the configured thresholds and fails unless the checks and every shard passed", () => {
    const verify = jobOf(CI, "verify")

    expect(verify).toContain(REQUIRED_CHECK)
    expect(verify).toContain("needs: [check, test]")
    expect(verify).toContain(UNLESS_CANCELLED)
    expect(verify).toContain(MERGE_COMMAND)
    expect(verify).not.toContain("--coverage.thresholds")
    expect(verify).toContain('if [[ "$CHECK_RESULT" != "success" || "$TEST_RESULT" != "success" ]]; then')
  })

  it("uploads the preview Worker as a version, deploying nothing, for every merge group and every pull request that can read the secrets", () => {
    const upload = jobOf(CI, "upload")

    expect(upload).toContain(`uses: ./${DEPLOY_WORKFLOW}`)
    expect(upload).toContain("target: preview")
    expect(upload).toContain("upload: true")
    expect(upload).toContain("github.event_name == 'merge_group' ||")
    expect(upload).toContain("github.event.pull_request.head.repo.full_name == github.repository")
  })
})

describe(DEPLOY_WORKFLOW, () => {
  it("uploads a version in place of the migrations and the deploy when asked to, and then records no GitHub deployment", () => {
    expect(DEPLOY).toContain(DEPLOYMENT_UNLESS_UPLOAD)
    expect(DEPLOY.split(UNLESS_UPLOAD)).toHaveLength(UPLOAD_SKIPPED_STEPS + 1)
    expect(DEPLOY).toContain("if: inputs.upload")
    expect(DEPLOY).toContain("vp exec wrangler versions upload --config dist/server/wrangler.json")
  })

  it("runs the uploads of different runs side by side and queues the deploys of one target", () => {
    expect(DEPLOY).toContain(UPLOAD_CONCURRENCY)
  })
})

describe(MAIN_WORKFLOW, () => {
  it(`runs the checks of ${CI_WORKFLOW} only for a commit that did not pass them before the merge`, () => {
    expect(jobOf(MAIN, "tested")).toContain('run: bun scripts/tested-commit.ts "$GITHUB_SHA" >> "$GITHUB_OUTPUT"')
    expect(jobOf(MAIN, "checks")).toContain("needs: tested")
    expect(jobOf(MAIN, "checks")).toContain(UNTESTED)
    expect(jobOf(MAIN, "checks")).toContain(`uses: ./${CI_WORKFLOW}`)
  })

  it("deploys the shared preview after the checks, and production only after the preview deploy succeeded", () => {
    expect(jobOf(MAIN, "deploy-preview")).toContain(TESTED_OR_CHECKED)
    expect(jobOf(MAIN, "deploy-preview")).toContain("target: preview")
    expect(jobOf(MAIN, "deploy-production")).toContain("needs: [tested, checks, deploy-preview]")
    expect(jobOf(MAIN, "deploy-production")).toContain(AFTER_PREVIEW)
  })
})

describe(PREVIEW_WORKFLOW, () => {
  it("deploys a branch to the shared preview only by hand, and only after its commit passed the checks main requires", () => {
    expect(triggersOf(PREVIEW)).toStrictEqual(["workflow_dispatch:"])
    expect(jobOf(PREVIEW, "tested")).toContain('run: bun scripts/tested-commit.ts "$GITHUB_SHA" | grep --quiet --line-regexp "tested=true"')
    expect(jobOf(PREVIEW, "deploy-preview")).toContain("needs: tested")
    expect(jobOf(PREVIEW, "deploy-preview")).toContain("target: preview")
  })
})

describe(JOURNEY_WORKFLOW, () => {
  it("runs the journey suite every night and by hand, and never cancels a run whose orders it still has to refund", () => {
    expect(triggersOf(JOURNEY)).toStrictEqual(["schedule:", "workflow_dispatch:"])
    expect(concurrencyOf(JOURNEY)).toEqual(expect.arrayContaining(QUEUED))
  })

  it("lets a manual run pick all journeys, one tier or the upgrade, which the suite tags its tests with", () => {
    expect(dispatchOptionsOf(JOURNEY)).toStrictEqual([ALL_JOURNEYS, ...LICENSE_TIERS, UPGRADE_JOURNEY])
    expect(JOURNEY).toContain(JOURNEY_FILTER)
    expect(JOURNEY_SPEC).toMatch(JOURNEY_TAG)
    expect(JOURNEY_SPEC).toContain(`journey: "${UPGRADE_JOURNEY}"`)
  })

  it("reads the Preview environment's secrets without recording a deployment, and gives the suite every setting it parses", () => {
    const job = jobOf(JOURNEY, "journey")

    expect(job).toContain("environment:\n      name: Preview\n      deployment: false\n")
    expect(JOURNEY_SECRET_NAMES).toHaveLength(JOURNEY_SETTING_NAMES.length - 1)

    for (const name of JOURNEY_SECRET_NAMES) {
      expect(job).toContain(`${name}: ${expression(`secrets.${name}`)}`)
    }
  })

  it("pays only in the Polar sandbox", () => {
    expect(jobOf(JOURNEY, "journey")).toContain(`POLAR_SERVER: ${POLAR_SERVER.SANDBOX}\n`)
    expect(JOURNEY_SETTINGS).toContain("POLAR_SERVER: zod.literal(POLAR_SERVER.SANDBOX)")
    expect(JOURNEY.split("secrets.")).toHaveLength(JOURNEY_SECRET_NAMES.length + 1)
  })

  it("summarises the run in the job summary and uploads the report unless the run was cancelled", () => {
    const job = jobOf(JOURNEY, "journey")

    expect(job).toContain(JOURNEY_SUMMARY)
    expect(job).toContain("name: journey-report")
    expect(job.split(UNLESS_CANCELLED)).toHaveLength(3)
    expect(job).not.toContain("actions: read")
  })
})

describe(SETUP_ACTION, () => {
  it("restores the dependency cache once, through setup-vp", () => {
    expect(SETUP).toContain("cache: true")
    expect(SETUP).not.toContain("actions/cache")
  })
})

describe("the release tag of a production deploy", () => {
  it("is chosen before the build, which shows it on the changelog's entries of that deploy", () => {
    const chosen = DEPLOY.search(CHOOSE_RELEASE_TAG)
    const built = DEPLOY.search(BUILD_WITH_RELEASE_TAG)

    expect(chosen).toBeGreaterThan(0)
    expect(built).toBeGreaterThan(chosen)
  })

  it("leaves the deploy as an output of the reusable workflow and becomes the tag the release job publishes", () => {
    expect(DEPLOY).toMatch(DEPLOY_JOB_RELEASE_TAG)
    expect(DEPLOY).toMatch(WORKFLOW_RELEASE_TAG)
    expect(jobOf(MAIN, "release")).toMatch(PUBLISH_RELEASE_TAG)
  })
})

describe(UPDATES_WORKFLOW, () => {
  it("looks for updates once a week and by hand, and never cancels a run that is writing the issue", () => {
    expect(triggersOf(UPDATES)).toStrictEqual(["schedule:", "workflow_dispatch:"])
    expect(UPDATES).toMatch(WEEKLY_SCHEDULE)
    expect(concurrencyOf(UPDATES)).toContain("cancel-in-progress: false")
  })

  it("may only read the repository and write issues", () => {
    expect(UPDATES).toContain(ISSUE_PERMISSIONS)
    expect(UPDATES.split("permissions:")).toHaveLength(2)
  })

  it("finds the updates in a step without a token and hands the token only to the step that writes the issue", () => {
    const job = jobOf(UPDATES, "report")
    const find = job.indexOf(`run: bun scripts/report-updates.ts ${REPORT_MODE.FIND} ${UPDATES_FILE}`)
    const issue = job.indexOf(`run: bun scripts/report-updates.ts ${REPORT_MODE.ISSUE} ${UPDATES_FILE}`)

    expect(find).toBeGreaterThan(0)
    expect(issue).toBeGreaterThan(find)
    expect(job.split("github.token")).toHaveLength(2)
    expect(job.indexOf("GH_TOKEN")).toBeGreaterThan(issue)
    expect(job).toContain("persist-credentials: false")
  })
})
