import { globSync, readFileSync, statSync } from "node:fs"
import { posix } from "node:path"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { DEPLOYED_HOSTS, ENVIRONMENT } from "~/src/modules/_core/constants/api"

const REMOTION_WORKFLOW = ".github/workflows/remotion.yml"
const DEPLOY_WORKFLOW = ".github/workflows/deploy-reusable.yml"
const REMOTION = readFileSync(REMOTION_WORKFLOW, "utf8")
const DEPLOY = readFileSync(DEPLOY_WORKFLOW, "utf8")
const REMOTION_PATHS = "remotion/**"
const REMOTION_SOURCES = "remotion/src/**/*.{ts,tsx}"
const ROOT_ALIAS = "~/"
const RESOLVED_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]

const IMPORT_SPECIFIER = /^(?:import|export) (?:[^"]*? from )?"(?<specifier>[^"]+)"/gmu
const LOCAL_SPECIFIER = /^(?:\.|~\/)/u
const TRIGGER_PATHS = /paths:\n(?<entries>(?: +- "[^"]+"\n)+)/gu
const TRIGGER_PATH = /"(?<path>[^"]+)"/gu
const ENVIRONMENT_URL = /url: \$\{\{ inputs\.target == '(?<target>[^']+)' && '(?<targetUrl>[^']+)' \|\| '(?<fallbackUrl>[^']+)' \}\}/u

const specifierSchema = zod.object({ specifier: zod.string() })
const entriesSchema = zod.object({ entries: zod.string() })
const pathSchema = zod.object({ path: zod.string() })
const triggerListsSchema = zod.tuple([zod.array(zod.string()), zod.array(zod.string())])
const environmentUrlSchema = zod.object({ fallbackUrl: zod.string(), target: zod.string(), targetUrl: zod.string() })

const isFile = (path: string): boolean => statSync(path, { throwIfNoEntry: false })?.isFile() === true

const resolveImport = (file: string, specifier: string): string => {
  const base = specifier.startsWith(ROOT_ALIAS) ? specifier.slice(ROOT_ALIAS.length) : posix.join(posix.dirname(file), specifier)
  const resolved = RESOLVED_SUFFIXES.map((suffix) => `${base}${suffix}`).find((candidate) => isFile(candidate))
  if (resolved === undefined) {
    throw new Error(`${file} imports ${specifier}, which resolves to no file`)
  }
  return resolved
}

const localImports = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(IMPORT_SPECIFIER)]
    .map((match) => specifierSchema.parse(match.groups).specifier)
    .filter((specifier) => LOCAL_SPECIFIER.test(specifier))
    .map((specifier) => resolveImport(file, specifier))

const importClosure = (entries: string[]): string[] => {
  const files = new Set(entries)
  for (const file of files) {
    for (const imported of localImports(file)) {
      files.add(imported)
    }
  }
  return [...files]
}

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
