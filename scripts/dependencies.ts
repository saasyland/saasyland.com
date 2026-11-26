import { type ParseError, parse } from "jsonc-parser"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import * as zod from "zod"

export const PACKAGE_JSON = "package.json"
export const BUN_LOCK = "bun.lock"
export const NPM_REGISTRY = "https://registry.npmjs.org"
export const VITE_PLUS = "vite-plus"
export const VITE_PLUS_BUNDLED: readonly string[] = ["vite", "vitest"]

const RANGE_SPEC = /^[\^~]/u
const SCRIPT_TOOL = /\bbunx (?:--bun )?(?<name>@?[\w.-]+(?:\/[\w.-]+)?)@(?<version>\d+\.\d+\.\d+[\w.-]*)/gu
const VERSION_SEPARATOR = "@"
const SEMVER = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?<prerelease>-.+)?$/u

const specsSchema = zod.record(zod.string(), zod.string()).default({})
const manifestSchema = zod.object({ dependencies: specsSchema, devDependencies: specsSchema, scripts: specsSchema })
const scriptToolSchema = zod.object({ name: zod.string(), version: zod.string() })
const lockedPackageSchema = zod.tuple([zod.string()], zod.unknown())
const bunLockSchema = zod.object({ packages: zod.record(zod.string(), lockedPackageSchema) })
const latestSchema = zod.object({ version: zod.string() })
const semverSchema = zod.object({
  major: zod.coerce.number(),
  minor: zod.coerce.number(),
  patch: zod.coerce.number(),
  prerelease: zod.string().optional(),
})

export interface Dependency {
  readonly name: string
  readonly package: string
  readonly spec: string
  readonly version: string
}

export interface OutdatedDependency extends Dependency {
  readonly latest: string
}

export type LatestVersion = (name: string) => Promise<string>

export const readManifest = (root: string): zod.infer<typeof manifestSchema> => {
  const manifest: unknown = JSON.parse(readFileSync(join(root, PACKAGE_JSON), "utf8"))

  return manifestSchema.parse(manifest)
}

const readBunLock = (root: string): zod.infer<typeof bunLockSchema> => {
  const errors: ParseError[] = []
  const value: unknown = parse(readFileSync(join(root, BUN_LOCK), "utf8"), errors, { allowTrailingComma: true })

  if (errors.length > 0) {
    throw new Error(`${BUN_LOCK} is not valid JSONC`)
  }

  return bunLockSchema.parse(value)
}

export const readScriptTools = (scripts: Readonly<Record<string, string>>): Dependency[] =>
  Object.values(scripts)
    .flatMap((script) => Array.from(script.matchAll(SCRIPT_TOOL), (match) => scriptToolSchema.parse(match.groups)))
    .map(({ name, version }) => ({ name, package: name, spec: version, version }))

export const readDependencies = (root: string): Dependency[] => {
  const { dependencies, devDependencies, scripts } = readManifest(root)
  const { packages } = readBunLock(root)

  const installed = Object.entries({ ...dependencies, ...devDependencies }).map(([name, spec]) => {
    const resolved = packages[name]?.[0]

    if (resolved === undefined) {
      throw new Error(`${BUN_LOCK} has no entry for ${name}; run bun install`)
    }

    const separator = resolved.lastIndexOf(VERSION_SEPARATOR)

    return { name, package: resolved.slice(0, separator), spec, version: resolved.slice(separator + 1) }
  })

  return [...installed, ...readScriptTools(scripts)].toSorted((left, right) => left.name.localeCompare(right.name))
}

export const isRange = (spec: string): boolean => RANGE_SPEC.test(spec)

export const isUpdatedByCommand = ({ name, spec }: Pick<Dependency, "name" | "spec">): boolean => isRange(spec) || name === VITE_PLUS

export const isNewer = (candidate: string, current: string): boolean => {
  const next = semverSchema.safeParse(SEMVER.exec(candidate)?.groups)
  const now = semverSchema.safeParse(SEMVER.exec(current)?.groups)

  if (!next.success || !now.success) {
    return candidate !== current
  }

  const order = next.data.major - now.data.major || next.data.minor - now.data.minor || next.data.patch - now.data.patch

  if (order !== 0) {
    return order > 0
  }

  return now.data.prerelease !== undefined && next.data.prerelease === undefined
}

export const latestVersion: LatestVersion = async (name) => {
  const response = await fetch(`${NPM_REGISTRY}/${name}/latest`)

  if (!response.ok) {
    throw new Error(`${NPM_REGISTRY} answered ${String(response.status)} for ${name}`)
  }

  return latestSchema.parse(await response.json()).version
}

const withLatest = (dependency: Dependency, latest: string): OutdatedDependency => ({ ...dependency, latest })

export const outdatedDependencies = async (dependencies: readonly Dependency[], latestOf: LatestVersion): Promise<OutdatedDependency[]> => {
  const checked = await Promise.all(
    dependencies
      .filter(({ name }) => !VITE_PLUS_BUNDLED.includes(name))
      .map(async (dependency) => withLatest(dependency, await latestOf(dependency.package))),
  )

  return checked.filter(({ latest, version }) => isNewer(latest, version))
}
