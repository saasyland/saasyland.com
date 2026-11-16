import { globSync, readFileSync } from "node:fs"
import { posix } from "node:path"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { importClosure } from "~/src/platform/testing/lib/import-closure"

import { DEPLOYED_HOSTS, ENVIRONMENT } from "~/src/modules/_core/constants/api"

const REMOTION_WORKFLOW = ".github/workflows/remotion.yml"
const DEPLOY_WORKFLOW = ".github/workflows/deploy-reusable.yml"
const REMOTION = readFileSync(REMOTION_WORKFLOW, "utf8")
const DEPLOY = readFileSync(DEPLOY_WORKFLOW, "utf8")
const REMOTION_PATHS = "remotion/**"
const REMOTION_SOURCES = "remotion/src/**/*.{ts,tsx}"

const TRIGGER_PATHS = /paths:\n(?<entries>(?: +- "[^"]+"\n)+)/gu
const TRIGGER_PATH = /"(?<path>[^"]+)"/gu
const ENVIRONMENT_URL = /url: \$\{\{ inputs\.target == '(?<target>[^']+)' && '(?<targetUrl>[^']+)' \|\| '(?<fallbackUrl>[^']+)' \}\}/u

const entriesSchema = zod.object({ entries: zod.string() })
const pathSchema = zod.object({ path: zod.string() })
const triggerListsSchema = zod.tuple([zod.array(zod.string()), zod.array(zod.string())])
const environmentUrlSchema = zod.object({ fallbackUrl: zod.string(), target: zod.string(), targetUrl: zod.string() })

const listedPaths = (entries: string): string[] => [...entries.matchAll(TRIGGER_PATH)].map((entry) => pathSchema.parse(entry.groups).path)

const triggerPaths = (workflow: string) =>
  triggerListsSchema.parse([...workflow.matchAll(TRIGGER_PATHS)].map((list) => listedPaths(entriesSchema.parse(list.groups).entries)))

const [PULL_REQUEST_PATHS, PUSH_PATHS] = triggerPaths(REMOTION)
const WORKFLOW_OWN_PATHS = [REMOTION_PATHS, REMOTION_WORKFLOW]
const WEBSITE_PATHS = PULL_REQUEST_PATHS.filter((glob) => !WORKFLOW_OWN_PATHS.includes(glob))
const IMPORTED_WEBSITE_FILES = importClosure(globSync(REMOTION_SOURCES)).filter((file) => !posix.matchesGlob(file, REMOTION_PATHS))

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
