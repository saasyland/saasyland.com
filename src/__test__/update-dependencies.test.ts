import { describe, expect, it, vi } from "vite-plus/test"

import { createSkillsRepository } from "~/src/platform/testing/lib/skills-repository"

import { type Dependency, VITE_PLUS } from "~/scripts/dependencies"
import { SKILLS_UPDATE_SCRIPT } from "~/scripts/sync-skills"
import { MIGRATE_OPTIONS, pinnedReport, updateCommands, updateDependencies } from "~/scripts/update-dependencies"

const RESEND = "resend"
const BETTER_AUTH = "better-auth"
const PASSED = 0
const FAILED = 1
const SKILLS_UPDATE_COMMAND = [...SKILLS_UPDATE_SCRIPT]

const dependency = (name: string, spec: string, version: string): Dependency => ({ name, package: name, spec, version })

const RANGE = dependency(RESEND, "^6.39.0", "6.39.0")
const PINNED = dependency(BETTER_AUTH, "1.7.27", "1.7.27")
const TOOLCHAIN = dependency(VITE_PLUS, "1.7.0", "1.7.0")

describe("updateCommands", () => {
  it("moves every range to its latest release, leaves the pins and then updates the agent skills", () => {
    expect(updateCommands([RANGE, PINNED, TOOLCHAIN], "1.7.0")).toStrictEqual([["update", "--latest", RESEND], SKILLS_UPDATE_COMMAND])
  })

  it("runs the migrator of a newer Vite+ release first", () => {
    expect(updateCommands([RANGE, TOOLCHAIN], "1.8.0")).toStrictEqual([
      ["x", `--package=${VITE_PLUS}@1.8.0`, "vp", "migrate", ...MIGRATE_OPTIONS],
      ["update", "--latest", RESEND],
      SKILLS_UPDATE_COMMAND,
    ])
  })

  it("never runs a bare bun update, which would move the pins too", () => {
    expect(updateCommands([PINNED], "1.8.0")).toStrictEqual([SKILLS_UPDATE_COMMAND])
  })
})

describe("pinnedReport", () => {
  it("names each pinned package with a newer release, and nothing the update command already moved", () => {
    expect(
      pinnedReport([
        { ...PINNED, latest: "1.7.30" },
        { ...RANGE, latest: "6.40.0" },
        { ...TOOLCHAIN, latest: "1.8.0" },
      ]),
    ).toStrictEqual([`${BETTER_AUTH} is pinned to 1.7.27; 1.7.30 is out. Read why it is pinned in the Dependencies docs before moving it.`])
  })
})

const repository = (): string =>
  createSkillsRepository({
    dependencies: { [BETTER_AUTH]: "1.7.27", [RESEND]: "^6.39.0" },
    devDependencies: { [VITE_PLUS]: "1.7.0" },
    resolved: { [BETTER_AUTH]: `${BETTER_AUTH}@1.7.27`, [RESEND]: `${RESEND}@6.39.0`, [VITE_PLUS]: `${VITE_PLUS}@1.7.0` },
  })

const latestOf = (name: string): Promise<string> => Promise.resolve(name === BETTER_AUTH ? "1.7.30" : "1.7.0")

describe("updateDependencies", () => {
  it("runs every update command and then names the pins that have a newer release", async () => {
    const run = vi.fn(() => PASSED)

    await expect(updateDependencies({ latestOf, root: repository(), run })).resolves.toStrictEqual([
      `${BETTER_AUTH} is pinned to 1.7.27; 1.7.30 is out. Read why it is pinned in the Dependencies docs before moving it.`,
    ])
    expect(run.mock.calls).toStrictEqual([[["update", "--latest", RESEND]], [SKILLS_UPDATE_COMMAND]])
  })

  it("stops at the first command that fails, before the skills are updated", async () => {
    const run = vi.fn(() => FAILED)

    await expect(updateDependencies({ latestOf, root: repository(), run })).rejects.toThrow(`bun update --latest ${RESEND} failed`)
    expect(run).toHaveBeenCalledTimes(1)
  })
})
