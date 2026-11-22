import { type ParseError, parse } from "jsonc-parser"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { z } from "zod/v4"

export const PACKAGE_JSON = "package.json"
export const BUN_LOCK = "bun.lock"
export const NPM_REGISTRY = "https://registry.npmjs.org"
export const VITE_PLUS = "vite-plus"
export const VITE_PLUS_BUNDLED: readonly string[] = ["vite", "vitest"]

const RANGE_SPEC = /^[\^~]/u
const VERSION_SEPARATOR = "@"
const SEMVER = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?<prerelease>-.+)?$/u

const specsSchema = z.record(z.string(), z.string()).default({})
const manifestSchema = z.object({ dependencies: specsSchema, devDependencies: specsSchema })
const lockedPackageSchema = z.tuple([z.string()], z.unknown())
const bunLockSchema = z.object({ packages: z.record(z.string(), lockedPackageSchema) })
const latestSchema = z.object({ version: z.string() })
const semverSchema = z.object({
  major: z.coerce.number(),
  minor: z.coerce.number(),
  patch: z.coerce.number(),
  prerelease: z.string().optional(),
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

export const readManifest = (root: string): z.infer<typeof manifestSchema> => {
  const manifest: unknown = JSON.parse(readFileSync(join(root, PACKAGE_JSON), "utf8"))

  return manifestSchema.parse(manifest)
}

const readBunLock = (root: string): z.infer<typeof bunLockSchema> => {
  const errors: ParseError[] = []
  const value: unknown = parse(readFileSync(join(root, BUN_LOCK), "utf8"), errors, { allowTrailingComma: true })

  if (errors.length > 0) {
    throw new Error(`${BUN_LOCK} is not valid JSONC`)
  }

  return bunLockSchema.parse(value)
}

export const readDependencies = (root: string): Dependency[] => {
  const { dependencies, devDependencies } = readManifest(root)
  const { packages } = readBunLock(root)

  return Object.entries({ ...dependencies, ...devDependencies })
    .map(([name, spec]) => {
      const resolved = packages[name]?.[0]

      if (resolved === undefined) {
        throw new Error(`${BUN_LOCK} has no entry for ${name}; run bun install`)
      }

      const separator = resolved.lastIndexOf(VERSION_SEPARATOR)

      return { name, package: resolved.slice(0, separator), spec, version: resolved.slice(separator + 1) }
    })
    .toSorted((left, right) => left.name.localeCompare(right.name))
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
