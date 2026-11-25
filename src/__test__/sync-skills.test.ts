import { existsSync, mkdirSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vite-plus/test"

import { createSkillsRepository } from "~/src/platform/testing/lib/skills-repository"

import { SKILL_SOURCES } from "~/src/data/skills"

import { type LockedSkill, SKILL_PACKAGES } from "~/scripts/skills-lock"
import {
  AGENTS_SKILLS,
  CLAUDE_SKILLS,
  SKILLS_INSTALL,
  SKILLS_UPDATE,
  arrangeSkills,
  groupRoot,
  linkTarget,
  skillLocation,
  syncSkills,
} from "~/scripts/sync-skills"

const RESEND_SOURCE = "resend/resend-skills"
const ROUTER_SOURCE = "TanStack/router"
const UNKNOWN_SOURCE = "someone/skills"
const RESEND = "resend"
const START = "react-start"
const ROUTER = "react-router"
const LOOSE = "loose"
const MISSING = "missing"
const SKILL_FILE = "SKILL.md"
const FAILED = 1
const PASSED = 0

const locked = (source: string, skillPath: string): LockedSkill => ({ commit: "1234567", computedHash: "a1", skillPath, source })

const SKILLS = {
  [RESEND]: locked(RESEND_SOURCE, "skills/resend/SKILL.md"),
  [START]: locked(ROUTER_SOURCE, "packages/react-start/skills/react-start/SKILL.md"),
}

const restore = (root: string, names: readonly string[]): void => {
  for (const name of names) {
    mkdirSync(join(root, AGENTS_SKILLS, name), { recursive: true })
    writeFileSync(join(root, AGENTS_SKILLS, name, SKILL_FILE), `# ${name}\n`)
  }
}

describe("skill locations", () => {
  it("places a skill in its group, or at the top level when its source has none", () => {
    expect(skillLocation(RESEND, SKILLS[RESEND])).toBe(`${SKILL_SOURCES[RESEND_SOURCE].group}/${RESEND}`)
    expect(skillLocation(START, SKILLS[START])).toBe(`tanstack/start/${START}`)
    expect(skillLocation(START, locked(ROUTER_SOURCE, "packages/start-client-core/skills/start-core/SKILL.md"))).toBe(
      `tanstack/start/${START}`,
    )
    expect(skillLocation(ROUTER, locked(ROUTER_SOURCE, "packages/react-router/skills/react-router/SKILL.md"))).toBe(
      `tanstack/router/${ROUTER}`,
    )
    expect(skillLocation(LOOSE, locked(UNKNOWN_SOURCE, SKILL_FILE))).toBe(LOOSE)
    expect(groupRoot("tanstack/start")).toBe("tanstack")
    expect(linkTarget("tanstack")).toBe(`../../${AGENTS_SKILLS}/tanstack`)
  })
})

describe("arrangeSkills", () => {
  it("moves each restored skill into its group and links every group root", () => {
    const root = createSkillsRepository({})
    restore(root, [RESEND, START])

    expect(arrangeSkills(root, SKILLS)).toStrictEqual({
      failures: [],
      summary: `Restored 2 skills, grouped 2, linked resend, tanstack into ${CLAUDE_SKILLS}.`,
      warnings: [],
    })
    expect(existsSync(join(root, AGENTS_SKILLS, "tanstack/start", START, SKILL_FILE))).toBe(true)
    expect(readdirSync(join(root, AGENTS_SKILLS)).toSorted()).toStrictEqual([RESEND, "tanstack"])
    expect(readlinkSync(join(root, CLAUDE_SKILLS, "tanstack"))).toBe(linkTarget("tanstack"))
  })

  it("warns about a skill the CLI did not restore and fails on a skill whose source has no group", () => {
    const root = createSkillsRepository({})
    restore(root, [LOOSE])

    expect(arrangeSkills(root, { [LOOSE]: locked(UNKNOWN_SOURCE, SKILL_FILE), [MISSING]: SKILLS[RESEND] })).toStrictEqual({
      failures: [`1 skills stayed at the top level. Add these sources to SKILL_SOURCES: ${UNKNOWN_SOURCE}`],
      summary: `Restored 2 skills, grouped 0, linked  into ${CLAUDE_SKILLS}.`,
      warnings: [
        `${LOOSE} (${UNKNOWN_SOURCE}) has no group in SKILL_SOURCES; leaving it at the top level.`,
        `${MISSING} was not restored by the skills CLI; run bunx skills add for it.`,
      ],
    })
    expect(existsSync(join(root, AGENTS_SKILLS, LOOSE, SKILL_FILE))).toBe(true)
  })
})

const repository = (): string =>
  createSkillsRepository({
    dependencies: { resend: "^6.39.0" },
    files: { [`${AGENTS_SKILLS}/stale/${SKILL_FILE}`]: "", [`agent/${SKILL_FILE}`]: "" },
    resolved: { resend: "resend@6.40.0" },
    skills: { [RESEND]: SKILLS[RESEND] },
  })

describe("syncSkills", () => {
  it("restores the locked skills without touching the lock or the recorded versions", () => {
    const root = repository()
    const run = vi.fn((args: readonly string[]) => {
      restore(root, args === SKILLS_INSTALL ? [RESEND] : [])

      return PASSED
    })

    expect(syncSkills({ root, run, update: false }).failures).toStrictEqual([])
    expect(run.mock.calls).toStrictEqual([[SKILLS_INSTALL]])
    expect(existsSync(join(root, AGENTS_SKILLS, "stale"))).toBe(false)
    expect(existsSync(join(root, "agent"))).toBe(false)
    expect(existsSync(join(root, SKILL_PACKAGES))).toBe(false)
  })

  it("updates the skills and records the versions of the packages they document", () => {
    const root = repository()
    const run = vi.fn((args: readonly string[]) => {
      restore(root, args === SKILLS_INSTALL ? [RESEND] : [])

      return PASSED
    })

    expect(syncSkills({ root, run, update: true }).summary).toContain("grouped 1")
    expect(run.mock.calls).toStrictEqual([[SKILLS_INSTALL], [SKILLS_UPDATE]])
    const recorded: unknown = JSON.parse(readFileSync(join(root, SKILL_PACKAGES), "utf8"))

    expect(recorded).toStrictEqual({ resend: "6.40.0" })
  })

  it("stops at the first CLI command that fails and records nothing", () => {
    const root = repository()
    const run = vi.fn(() => FAILED)

    expect(syncSkills({ root, run, update: true })).toStrictEqual({
      failures: [`skills ${SKILLS_INSTALL.join(" ")} failed`],
      summary: "",
      warnings: [],
    })
    expect(run).toHaveBeenCalledTimes(1)
    expect(existsSync(join(root, SKILL_PACKAGES))).toBe(false)
  })
})
