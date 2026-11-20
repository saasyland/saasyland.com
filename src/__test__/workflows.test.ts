import { globSync, readFileSync } from "node:fs"
import { posix } from "node:path"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { importClosure } from "~/src/platform/testing/lib/import-closure"

import { DEPLOYED_HOSTS, ENVIRONMENT } from "~/src/modules/_core/constants/api"

const REMOTION_WORKFLOW = ".github/workflows/remotion.yml"
const DEPLOY_WORKFLOW = ".github/workflows/deploy-reusable.yml"
const E2E_WORKFLOW = ".github/workflows/e2e-reusable.yml"
const CI_WORKFLOW = ".github/workflows/ci.yml"
const REMOTION = readFileSync(REMOTION_WORKFLOW, "utf8")
const DEPLOY = readFileSync(DEPLOY_WORKFLOW, "utf8")
const E2E = readFileSync(E2E_WORKFLOW, "utf8")
const CI = readFileSync(CI_WORKFLOW, "utf8")
const RELEASE_JOB = "\n  release:\n"
const WHOLE_COMMIT_HISTORY = ["fetch-depth: 0", "filter: tree:0"]
const REMOTION_PATHS = "remotion/**"
const REMOTION_SOURCES = "remotion/src/**/*.{ts,tsx}"

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
const ENVIRONMENT_URL = /url: \$\{\{ inputs\.target == '(?<target>[^']+)' && '(?<targetUrl>[^']+)' \|\| '(?<fallbackUrl>[^']+)' \}\}/u

const entriesSchema = zod.object({ entries: zod.string() })
const pathSchema = zod.object({ path: zod.string() })
const triggerListsSchema = zod.tuple([zod.array(zod.string()), zod.array(zod.string())])
const checkoutOptionsSchema = zod.object({ options: zod.string() })
const environmentUrlSchema = zod.object({ fallbackUrl: zod.string(), target: zod.string(), targetUrl: zod.string() })

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

const releaseJobOf = (workflow: string): string => workflow.slice(workflow.indexOf(RELEASE_JOB))

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
    { checkouts: checkoutsOf(E2E), job: `the build in ${E2E_WORKFLOW}` },
    { checkouts: checkoutsOf(DEPLOY), job: `the build in ${DEPLOY_WORKFLOW}` },
    { checkouts: checkoutsOf(releaseJobOf(CI)), job: `the release job in ${CI_WORKFLOW}` },
  ])("fetch every commit without its trees for $job, which dates the changelog entries", ({ checkouts }) => {
    expect(checkouts).toHaveLength(1)
    expect(checkouts.flat()).toEqual(expect.arrayContaining(WHOLE_COMMIT_HISTORY))
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
    expect(releaseJobOf(CI)).toMatch(PUBLISH_RELEASE_TAG)
  })
})
