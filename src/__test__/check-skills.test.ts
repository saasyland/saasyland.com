import { spawnSync } from "node:child_process"
import { mkdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vite-plus/test"

import { createContentDirectory } from "~/src/platform/testing/lib/content-directory"
import { createSkillsRepository } from "~/src/platform/testing/lib/skills-repository"

import { SKILL_SOURCES } from "~/src/data/skills"

import { installProblems, packageProblems, skillFolderHash, skillProblems, sourceProblems } from "~/scripts/check-skills"
import { BUN_LOCK, type Dependency, PACKAGE_JSON } from "~/scripts/dependencies"
import { type LockedSkill, SKILLS_LOCK, SKILLS_SYNC_COMMAND, SKILLS_UPDATE_COMMAND, SKILL_PACKAGES } from "~/scripts/skills-lock"
import { AGENTS_SKILLS, CLAUDE_SKILLS, linkTarget } from "~/scripts/sync-skills"

const RESEND_SOURCE = "resend/resend-skills"
const ROUTER_SOURCE = "TanStack/router"
const UNKNOWN_SOURCE = "someone/skills"
const RESEND = "resend"
const START = "react-start"
const LOOSE = "loose"
const SKILL_FILE = "SKILL.md"
const SKILL_TEXT = "# Skill\n"
const FIXTURE_HASH = "6e8f9b3187efc3e4322afeed75b3afb76d895ff3bcb709b043af3a4e95aa5370"
const SIMPLE_FIXTURE_HASH = "581c7794151b9684fc6bf26a349f6f8a87a93b56eac89365922828ed4f507f73"

const locked = (source: string, skillPath: string, computedHash = ""): LockedSkill => ({
  commit: "1234567",
  computedHash,
  skillPath,
  source,
})

const dependency = (name: string, version: string): Dependency => ({ name, package: name, spec: `^${version}`, version })

const ALL_PACKAGES = [
  dependency("@cloudflare/vite-plugin", "1.70.1"),
  dependency("@polar-sh/sdk", "1.3.2"),
  dependency("@tanstack/react-router", "1.170.46"),
  dependency("@tanstack/react-start", "1.169.7"),
  dependency("@tanstack/react-table", "9.3.1"),
  dependency("better-auth", "1.7.27"),
  dependency("react-email", "6.11.16"),
  dependency("resend", "6.39.0"),
  dependency("wrangler", "4.166.0"),
]

const RECORDED = Object.fromEntries(ALL_PACKAGES.map(({ name, version }) => [name, version]))

const writeSimpleSkill = (directory: string): void => {
  mkdirSync(join(directory, "references"), { recursive: true })
  mkdirSync(join(directory, ".git"), { recursive: true })
  writeFileSync(join(directory, SKILL_FILE), "# Skill\r\n")
  writeFileSync(join(directory, "references/guide.md"), "Guide\n")
  writeFileSync(join(directory, "metadata.json"), "{}")
  writeFileSync(join(directory, ".git/HEAD"), "x")
}

describe("skillFolderHash", () => {
  it("hashes a skill folder as the skills CLI does, without metadata.json or .git and with Windows line endings normalised", () => {
    const root = createContentDirectory({})
    writeSimpleSkill(join(root, "skill"))

    expect(skillFolderHash(join(root, "skill"))).toBe(SIMPLE_FIXTURE_HASH)
  })

  it("follows links that stay inside the skill, skips the others, breaks cycles and leaves binary files and special files alone", () => {
    const root = createContentDirectory({ "outside.txt": "outside" })
    const skill = join(root, "skill")
    writeSimpleSkill(skill)
    symlinkSync("references/guide.md", join(skill, "linked.md"))
    symlinkSync("references", join(skill, "linked-dir"))
    symlinkSync("../outside.txt", join(skill, "outside.mjs"))
    symlinkSync("missing", join(skill, "broken.md"))
    symlinkSync("..", join(skill, "references/up"))
    symlinkSync("references", join(skill, ".git-link"))
    mkdirSync(join(skill, "refs2"))
    symlinkSync("../references", join(skill, "refs2/.git"))
    writeFileSync(join(skill, "binary.bin"), Buffer.from("a\r\n\0b", "latin1"))
    spawnSync("mkfifo", [join(skill, "pipe")])

    expect(skillFolderHash(skill)).toBe(FIXTURE_HASH)
  })
})

describe("sourceProblems", () => {
  it("names a locked source without a group and a mapped source without a skill", () => {
    const skills = Object.fromEntries(
      Object.keys(SKILL_SOURCES)
        .filter((source) => source !== RESEND_SOURCE)
        .map((source) => [source, locked(source, SKILL_FILE)]),
    )

    expect(sourceProblems({ ...skills, unknown: locked(UNKNOWN_SOURCE, SKILL_FILE) })).toStrictEqual([
      `${UNKNOWN_SOURCE} is in ${SKILLS_LOCK} but not in SKILL_SOURCES (src/data/skills.ts): add its group and the packages its skills document`,
      `${RESEND_SOURCE} is in SKILL_SOURCES but no skill in ${SKILLS_LOCK} comes from it: remove it`,
    ])
  })
})

describe("packageProblems", () => {
  it("accepts packages whose versions match the ones the skills were last updated for", () => {
    expect(packageProblems(ALL_PACKAGES, RECORDED)).toStrictEqual([])
  })

  it("asks for a skills update when a documented package moved, has no recorded version or is no longer documented", () => {
    const moved = ALL_PACKAGES.map((each) => (each.name === RESEND ? dependency(RESEND, "6.40.0") : each))
    const { wrangler, ...withoutWrangler } = RECORDED

    expect(packageProblems(moved, { ...withoutWrangler, retired: "1.0.0" })).toStrictEqual([
      `${RESEND} is 6.40.0 in ${BUN_LOCK}, but the agent skills were last updated for 6.39.0: run ${SKILLS_UPDATE_COMMAND}`,
      `${SKILL_PACKAGES} records retired, which no skill source documents: run ${SKILLS_UPDATE_COMMAND}`,
      `wrangler ${String(wrangler)} has no version in ${SKILL_PACKAGES}: run ${SKILLS_UPDATE_COMMAND}`,
    ])
  })

  it("names a package pattern that matches no dependency", () => {
    const withoutResend = ALL_PACKAGES.filter(({ name }) => name !== RESEND)
    const recorded = Object.fromEntries(withoutResend.map(({ name, version }) => [name, version]))

    expect(packageProblems(withoutResend, recorded)).toStrictEqual([
      `${RESEND_SOURCE} documents ${RESEND}, which ${PACKAGE_JSON} does not list: remove it from SKILL_SOURCES`,
    ])
  })
})

const installSkill = (root: string, location: string): string => {
  const directory = join(root, AGENTS_SKILLS, location)
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, SKILL_FILE), SKILL_TEXT)

  return skillFolderHash(directory)
}

const linkGroup = (root: string, group: string): void => {
  mkdirSync(join(root, CLAUDE_SKILLS), { recursive: true })
  symlinkSync(linkTarget(group), join(root, CLAUDE_SKILLS, group))
}

const installedRepository = (): { root: string; skills: Record<string, LockedSkill> } => {
  const root = createContentDirectory({})
  const resendHash = installSkill(root, `${RESEND}/${RESEND}`)
  const startHash = installSkill(root, `tanstack/start/${START}`)
  const looseHash = installSkill(root, LOOSE)
  linkGroup(root, RESEND)
  linkGroup(root, "tanstack")

  return {
    root,
    skills: {
      [LOOSE]: locked(UNKNOWN_SOURCE, SKILL_FILE, looseHash),
      [RESEND]: locked(RESEND_SOURCE, "skills/resend/SKILL.md", resendHash),
      [START]: locked(ROUTER_SOURCE, "packages/react-start/skills/react-start/SKILL.md", startHash),
    },
  }
}

describe("installProblems", () => {
  it("has nothing to check before the skills are installed", () => {
    expect(installProblems(createContentDirectory({}), { [RESEND]: locked(RESEND_SOURCE, SKILL_FILE) })).toStrictEqual([])
  })

  it("accepts skills installed exactly as locked and linked by group", () => {
    const { root, skills } = installedRepository()

    expect(installProblems(root, skills)).toStrictEqual([])
  })

  it("names a skill that is missing, edited or not locked, and a group link that is missing, wrong or extra", () => {
    const { root, skills } = installedRepository()
    writeFileSync(join(root, AGENTS_SKILLS, RESEND, RESEND, SKILL_FILE), "# Edited\n")
    rmSync(join(root, AGENTS_SKILLS, "tanstack/start", START), { recursive: true })
    mkdirSync(join(root, AGENTS_SKILLS, "tanstack/start/stray"))
    mkdirSync(join(root, AGENTS_SKILLS, ".staging"))
    unlinkSync(join(root, CLAUDE_SKILLS, "tanstack"))
    mkdirSync(join(root, CLAUDE_SKILLS, "tanstack"))
    unlinkSync(join(root, CLAUDE_SKILLS, RESEND))
    symlinkSync("../elsewhere", join(root, CLAUDE_SKILLS, RESEND))
    linkGroup(root, "extra")

    expect(installProblems(root, skills).toSorted()).toStrictEqual(
      [
        `${AGENTS_SKILLS}/${RESEND}/${RESEND} differs from ${SKILLS_LOCK}: run ${SKILLS_SYNC_COMMAND} to restore it`,
        `${AGENTS_SKILLS}/tanstack/start/${START} is missing: run ${SKILLS_SYNC_COMMAND}`,
        `${AGENTS_SKILLS}/tanstack/start/stray is not in ${SKILLS_LOCK}: run ${SKILLS_SYNC_COMMAND}`,
        `${AGENTS_SKILLS}/.staging is not in ${SKILLS_LOCK}: run ${SKILLS_SYNC_COMMAND}`,
        `${CLAUDE_SKILLS}/tanstack does not link to ${AGENTS_SKILLS}/tanstack: run ${SKILLS_SYNC_COMMAND}`,
        `${CLAUDE_SKILLS}/${RESEND} does not link to ${AGENTS_SKILLS}/${RESEND}: run ${SKILLS_SYNC_COMMAND}`,
        `${CLAUDE_SKILLS}/extra is not a skill group: run ${SKILLS_SYNC_COMMAND}`,
      ].toSorted(),
    )
  })

  it("names a missing group link and a missing links directory", () => {
    const { root, skills } = installedRepository()
    unlinkSync(join(root, CLAUDE_SKILLS, RESEND))

    expect(installProblems(root, skills)).toStrictEqual([
      `${CLAUDE_SKILLS}/${RESEND} does not link to ${AGENTS_SKILLS}/${RESEND}: run ${SKILLS_SYNC_COMMAND}`,
    ])

    rmSync(join(root, CLAUDE_SKILLS), { recursive: true })

    expect(installProblems(root, skills)).toStrictEqual([`${CLAUDE_SKILLS} is missing: run ${SKILLS_SYNC_COMMAND}`])
  })
})

describe("skillProblems", () => {
  it("checks the sources, the package versions and the installed skills of a repository", () => {
    const root = createSkillsRepository({
      dependencies: { resend: "^6.40.0" },
      recorded: { resend: "6.39.0" },
      resolved: { resend: "resend@6.40.0" },
      skills: { [RESEND]: locked(RESEND_SOURCE, "skills/resend/SKILL.md") },
    })

    expect(skillProblems(root)).toContain(
      `${RESEND} is 6.40.0 in ${BUN_LOCK}, but the agent skills were last updated for 6.39.0: run ${SKILLS_UPDATE_COMMAND}`,
    )
    expect(skillProblems(root)).toContain(`${ROUTER_SOURCE} is in SKILL_SOURCES but no skill in ${SKILLS_LOCK} comes from it: remove it`)
  })
})
