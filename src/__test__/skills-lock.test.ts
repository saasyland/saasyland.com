import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vite-plus/test"

import { createSkillsRepository } from "~/src/platform/testing/lib/skills-repository"

import type { Dependency } from "~/scripts/dependencies"
import {
  SKILL_PACKAGES,
  documentedDependencies,
  readRecordedVersions,
  readSkillsLock,
  skillPackageVersions,
  writeRecordedVersions,
} from "~/scripts/skills-lock"

const RESEND = "resend"
const SDK = "@polar-sh/sdk"
const ZOD = "zod"
const SKILL = { commit: "063246e", computedHash: "a1", skillPath: "skills/resend/SKILL.md", source: "resend/resend-skills" }

const dependency = (name: string, version: string): Dependency => ({ name, package: name, spec: `^${version}`, version })

const DEPENDENCIES = [dependency(ZOD, "4.6.7"), dependency(SDK, "1.3.2"), dependency(RESEND, "6.39.0")]

describe("readSkillsLock", () => {
  it("reads the locked skills", () => {
    expect(readSkillsLock(createSkillsRepository({ skills: { [RESEND]: SKILL } }))).toStrictEqual({ [RESEND]: SKILL })
  })
})

describe("documentedDependencies", () => {
  it("picks the dependencies that match a package name or a scope", () => {
    expect(documentedDependencies([RESEND], DEPENDENCIES)).toStrictEqual([dependency(RESEND, "6.39.0")])
    expect(documentedDependencies(["@polar-sh/*"], DEPENDENCIES)).toStrictEqual([dependency(SDK, "1.3.2")])
    expect(
      documentedDependencies(["@polar-sh/*"], [dependency("@polar-sh-fork/sdk", "1.0.0"), dependency("polar", "1.0.0")]),
    ).toStrictEqual([])
    expect(documentedDependencies([RESEND], [dependency("react-email", "5.0.0")])).toStrictEqual([])
  })
})

describe("skillPackageVersions", () => {
  it("names the version of every dependency a skill source documents, sorted by name", () => {
    expect(skillPackageVersions(DEPENDENCIES)).toStrictEqual({ [RESEND]: "6.39.0", [SDK]: "1.3.2" })
    expect(Object.keys(skillPackageVersions(DEPENDENCIES))).toStrictEqual([SDK, RESEND])
  })
})

describe("recorded versions", () => {
  it("reads nothing when no version was recorded yet", () => {
    expect(readRecordedVersions(createSkillsRepository({}))).toStrictEqual({})
  })

  it("writes the versions as formatted JSON and reads them back", () => {
    const root = createSkillsRepository({})
    writeRecordedVersions(root, { [RESEND]: "6.39.0" })

    expect(readFileSync(join(root, SKILL_PACKAGES), "utf8")).toBe('{\n  "resend": "6.39.0"\n}\n')
    expect(readRecordedVersions(root)).toStrictEqual({ [RESEND]: "6.39.0" })
  })
})
