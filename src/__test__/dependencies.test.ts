import { describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

import { createContentDirectory } from "~/src/platform/testing/lib/content-directory"
import { createSkillsRepository } from "~/src/platform/testing/lib/skills-repository"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import {
  BUN_LOCK,
  type Dependency,
  NPM_REGISTRY,
  PACKAGE_JSON,
  VITE_PLUS,
  isNewer,
  isRange,
  isUpdatedByCommand,
  latestVersion,
  outdatedDependencies,
  readDependencies,
  readScriptTools,
} from "~/scripts/dependencies"

const RESEND = "resend"
const SDK = "@polar-sh/sdk"
const VITE = "vite"
const VITE_CORE = "@voidzero-dev/vite-plus-core"
const CDXGEN = "@cdxgen/cdxgen"
const CDXGEN_VERSION = "13.8.0"

const dependency = (overrides: Partial<Dependency>): Dependency => ({
  name: RESEND,
  package: RESEND,
  spec: "^6.39.0",
  version: "6.39.0",
  ...overrides,
})

describe("readDependencies", () => {
  it("lists every direct dependency with the version bun.lock resolves it to, under the name an alias points at", () => {
    const root = createSkillsRepository({
      dependencies: { [RESEND]: "^6.39.0" },
      devDependencies: { [SDK]: "1.3.2", [VITE]: `npm:${VITE_CORE}@8.3.8000` },
      resolved: { [RESEND]: `${RESEND}@6.40.1`, [SDK]: `${SDK}@1.3.2`, [VITE]: `${VITE_CORE}@8.3.8000` },
    })

    expect(readDependencies(root)).toStrictEqual([
      { name: SDK, package: SDK, spec: "1.3.2", version: "1.3.2" },
      { name: RESEND, package: RESEND, spec: "^6.39.0", version: "6.40.1" },
      { name: VITE, package: VITE_CORE, spec: `npm:${VITE_CORE}@8.3.8000`, version: "8.3.8000" },
    ])
  })

  it("reads a manifest without dependency lists", () => {
    const root = createContentDirectory({ [BUN_LOCK]: '{ "packages": {} }', [PACKAGE_JSON]: "{}" })

    expect(readDependencies(root)).toStrictEqual([])
  })

  it("lists a tool a script runs with bunx at an exact version as a pinned dependency", () => {
    const root = createContentDirectory({
      [BUN_LOCK]: '{ "packages": {} }',
      [PACKAGE_JSON]: JSON.stringify({ scripts: { sbom: `bunx --bun ${CDXGEN}@${CDXGEN_VERSION} --type js .` } }),
    })

    expect(readDependencies(root)).toStrictEqual([{ name: CDXGEN, package: CDXGEN, spec: CDXGEN_VERSION, version: CDXGEN_VERSION }])
  })

  it("asks for an install when bun.lock has not resolved a dependency", () => {
    const root = createSkillsRepository({ dependencies: { [RESEND]: "^6.39.0" } })

    expect(() => readDependencies(root)).toThrow(`${BUN_LOCK} has no entry for ${RESEND}; run bun install`)
  })

  it("refuses a bun.lock that is not JSONC", () => {
    const root = createContentDirectory({ [BUN_LOCK]: "{ packages: [", [PACKAGE_JSON]: "{}" })

    expect(() => readDependencies(root)).toThrow(`${BUN_LOCK} is not valid JSONC`)
  })
})

describe("readScriptTools", () => {
  it("reads every bunx call with an exact version, scoped or not, and skips one that runs an installed binary", () => {
    expect(
      readScriptTools({
        fmt: "bunx vp fmt",
        sbom: `bunx ${CDXGEN}@${CDXGEN_VERSION} . && bunx --bun skills@1.9.0-beta.1 list`,
        test: "vp test",
      }),
    ).toStrictEqual([
      { name: CDXGEN, package: CDXGEN, spec: CDXGEN_VERSION, version: CDXGEN_VERSION },
      { name: "skills", package: "skills", spec: "1.9.0-beta.1", version: "1.9.0-beta.1" },
    ])
  })
})

describe("isRange and isUpdatedByCommand", () => {
  it("treats a caret or tilde range as one the update command may move", () => {
    expect(isRange("^1.0.0")).toBe(true)
    expect(isRange("~1.0.0")).toBe(true)
    expect(isRange("1.0.0")).toBe(false)
    expect(isRange(`npm:${VITE_CORE}@8.3.8000`)).toBe(false)
  })

  it("lets the update command move a range and Vite+ itself, and leaves every other pin to a person", () => {
    expect(isUpdatedByCommand({ name: RESEND, spec: "^6.39.0" })).toBe(true)
    expect(isUpdatedByCommand({ name: VITE_PLUS, spec: "1.7.0" })).toBe(true)
    expect(isUpdatedByCommand({ name: "better-auth", spec: "1.7.27" })).toBe(false)
  })
})

describe("isNewer", () => {
  it("compares the major, minor and patch numbers in turn", () => {
    expect(isNewer("2.0.0", "1.9.9")).toBe(true)
    expect(isNewer("1.10.0", "1.9.9")).toBe(true)
    expect(isNewer("1.9.10", "1.9.9")).toBe(true)
    expect(isNewer("1.9.8", "1.9.9")).toBe(false)
    expect(isNewer("1.9.9", "1.9.9")).toBe(false)
  })

  it("counts the release as newer than its prerelease, and not the other way round", () => {
    expect(isNewer("0.1.0", "0.1.0-beta.5")).toBe(true)
    expect(isNewer("0.1.0-beta.6", "0.1.0")).toBe(false)
    expect(isNewer("0.1.0-beta.4", "0.1.0-beta.5")).toBe(false)
  })

  it("reports any other version when either one is not semver", () => {
    expect(isNewer("next", "1.0.0")).toBe(true)
    expect(isNewer("next", "next")).toBe(false)
  })
})

describe("latestVersion", () => {
  it("reads the latest version of a package from the npm registry", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ version: "1.4.0" }))

    await expect(latestVersion(SDK)).resolves.toBe("1.4.0")
    expect(fetch).toHaveBeenCalledWith(`${NPM_REGISTRY}/${SDK}/latest`)
  })

  it("fails when the registry does not answer with the package", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: HTTP_STATUS.NOT_FOUND }))

    await expect(latestVersion(SDK)).rejects.toThrow(`${NPM_REGISTRY} answered ${String(HTTP_STATUS.NOT_FOUND)} for ${SDK}`)
  })
})

describe("outdatedDependencies", () => {
  it("returns the dependencies with a newer release, asking the registry under each real package name", async () => {
    const latest = new Map([
      [RESEND, "6.41.0"],
      [SDK, "1.3.2"],
      [VITE_CORE, "8.4.0000"],
      [VITE_PLUS, "1.8.0"],
    ])
    const latestOf = vi.fn((name: string) => Promise.resolve(zod.string().parse(latest.get(name))))
    const dependencies = [
      dependency({}),
      dependency({ name: SDK, package: SDK, spec: "1.3.2", version: "1.3.2" }),
      dependency({ name: VITE, package: VITE_CORE, spec: `npm:${VITE_CORE}@8.3.8000`, version: "8.3.8000" }),
      dependency({ name: VITE_PLUS, package: VITE_PLUS, spec: "1.7.0", version: "1.7.0" }),
    ]

    await expect(outdatedDependencies(dependencies, latestOf)).resolves.toStrictEqual([
      { ...dependency({}), latest: "6.41.0" },
      { ...dependency({ name: VITE_PLUS, package: VITE_PLUS, spec: "1.7.0", version: "1.7.0" }), latest: "1.8.0" },
    ])
    expect(latestOf).not.toHaveBeenCalledWith(VITE_CORE)
  })
})
