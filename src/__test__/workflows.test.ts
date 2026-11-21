import { globSync, readFileSync } from "node:fs"
import { posix } from "node:path"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { importClosure } from "~/src/platform/testing/lib/import-closure"

import { DEPLOYED_HOSTS, ENVIRONMENT } from "~/src/modules/_core/constants/api"

const REMOTION_WORKFLOW = ".github/workflows/remotion.yml"
const DEPLOY_WORKFLOW = ".github/workflows/deploy-reusable.yml"
const E2E_WORKFLOW = ".github/workflows/e2e-reusable.yml"
const E2E_FULL_WORKFLOW = ".github/workflows/e2e-full.yml"
const CI_WORKFLOW = ".github/workflows/ci.yml"
const MAIN_WORKFLOW = ".github/workflows/deploy.yml"
const SETUP_ACTION = ".github/actions/setup/action.yml"
const REMOTION = readFileSync(REMOTION_WORKFLOW, "utf8")
const DEPLOY = readFileSync(DEPLOY_WORKFLOW, "utf8")
const E2E = readFileSync(E2E_WORKFLOW, "utf8")
const E2E_FULL = readFileSync(E2E_FULL_WORKFLOW, "utf8")
const CI = readFileSync(CI_WORKFLOW, "utf8")
const MAIN = readFileSync(MAIN_WORKFLOW, "utf8")
const SETUP = readFileSync(SETUP_ACTION, "utf8")
const E2E_SHARDS = [1, 2, 3, 4]
const JOBS_SECTION = "\njobs:\n"
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
const UNLESS_CANCELLED = `if: ${expression("!cancelled()")}`
const PULL_REQUEST_CANCELLATION = `cancel-in-progress: ${expression("github.event_name == 'pull_request'")}`

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
    expect(build).toContain("tar --create --file test-worker.tar dist .wrangler/test")
    expect(build).toContain(TEST_WORKER_ARTIFACT)
    expect(shard).toContain("needs: build")
    expect(shard).toContain(TEST_WORKER_ARTIFACT)
    expect(shard).not.toContain("build:test")
  })

  it("splits the browser suite across four shards that each run their part", () => {
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
})

describe(MAIN_WORKFLOW, () => {
  it(`runs the checks of ${CI_WORKFLOW} before it deploys production`, () => {
    expect(jobOf(MAIN, "checks")).toContain(`uses: ./${CI_WORKFLOW}`)
    expect(jobOf(MAIN, "deploy-production")).toContain("needs: checks")
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
