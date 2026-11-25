import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vite-plus/test"

import { createContentDirectory } from "~/src/platform/testing/lib/content-directory"
import { createSkillsRepository } from "~/src/platform/testing/lib/skills-repository"

import type { OutdatedDependency } from "~/scripts/dependencies"
import type { LatestRelease } from "~/scripts/github-actions"
import {
  type Gh,
  ISSUE_ACTION,
  ISSUE_TITLE,
  UPDATE_COMMAND,
  UP_TO_DATE_COMMENT,
  type Updates,
  changedSkills,
  findUpdates,
  issueBody,
  readUpdates,
  syncIssue,
  writeUpdates,
} from "~/scripts/report-updates"
import { type LockedSkill, SKILLS_LOCK } from "~/scripts/skills-lock"
import { SKILLS_UPDATE_SCRIPT } from "~/scripts/sync-skills"

const RESEND_SOURCE = "resend/resend-skills"
const RESEND = "resend"
const GONE = "gone"
const KEPT = "kept"
const PASSED = 0
const FAILED = 1
const ISSUE_NUMBER = 42

const skill = (computedHash: string, commit?: string): LockedSkill => ({
  ...(commit === undefined ? {} : { commit }),
  computedHash,
  skillPath: "skills/resend/SKILL.md",
  source: RESEND_SOURCE,
})

const RANGE: OutdatedDependency = { latest: "6.40.0", name: RESEND, package: RESEND, spec: "^6.39.0", version: "6.39.0" }
const PINNED: OutdatedDependency = { latest: "1.7.30", name: "better-auth", package: "better-auth", spec: "1.7.27", version: "1.7.27" }
const SKILL_CHANGE = { from: "063246e", name: RESEND, source: RESEND_SOURCE, to: "abcdef1" }
const CHECKOUT = "actions/checkout"
const ACTION_CHANGE = { from: "v7.0.0", name: CHECKOUT, to: "v7.0.1" }
const NOTHING: Updates = { actions: [], packages: [], skills: [] }
const EVERYTHING: Updates = { actions: [ACTION_CHANGE], packages: [RANGE, PINNED], skills: [SKILL_CHANGE] }

describe("changedSkills", () => {
  it("names each skill whose files changed upstream, with the commits it moves between", () => {
    const before = { [GONE]: skill("g1", "1111111"), [KEPT]: skill("k1", "2222222"), [RESEND]: skill("r1", "063246e39987") }
    const after = { [KEPT]: skill("k1", "3333333"), [RESEND]: skill("r2", "abcdef1234567") }

    expect(changedSkills(before, after)).toStrictEqual([SKILL_CHANGE])
  })

  it("marks a commit the lock does not record as unknown", () => {
    expect(changedSkills({ [RESEND]: skill("r1") }, { [RESEND]: skill("r2") })).toStrictEqual([
      { from: "unknown", name: RESEND, source: RESEND_SOURCE, to: "unknown" },
    ])
  })
})

describe("issueBody", () => {
  it("tells how to update and lists the packages, marking the pins, the skills and the GitHub Actions", () => {
    const body = issueBody(EVERYTHING)

    expect(body).toContain(`Run \`${UPDATE_COMMAND}\``)
    expect(body).toContain(`| \`${RESEND}\` | 6.39.0 | 6.40.0 | \`${UPDATE_COMMAND}\` |`)
    expect(body).toContain("| `better-auth` | 1.7.27 | 1.7.30 | by hand: pinned |")
    expect(body).toContain(`| \`${RESEND}\` | \`${RESEND_SOURCE}\` | 063246e | abcdef1 |`)
    expect(body).toContain(`| \`${CHECKOUT}\` | v7.0.0 | v7.0.1 |`)
    expect(body.endsWith("|\n")).toBe(true)
  })

  it("leaves out a section that has nothing to list", () => {
    expect(issueBody({ actions: [], packages: [RANGE], skills: [] })).not.toContain("## Agent skills")
    expect(issueBody({ actions: [], packages: [], skills: [SKILL_CHANGE] })).not.toContain("## Packages")
    expect(issueBody({ actions: [], packages: [RANGE], skills: [] })).not.toContain("## GitHub Actions")
  })
})

const fakeGh = (open: readonly { number: number; title: string }[], status = PASSED) => {
  const gh = vi.fn<Gh>((args) => ({ status, stdout: args[1] === "list" ? JSON.stringify(open) : "" }))

  return gh
}

const OPEN = [
  { number: 7, title: "Something else" },
  { number: ISSUE_NUMBER, title: ISSUE_TITLE },
]

describe("syncIssue", () => {
  it("opens the issue when there are updates and none is open", () => {
    const gh = fakeGh([])

    expect(syncIssue(gh, EVERYTHING)).toBe(ISSUE_ACTION.CREATED)
    expect(gh).toHaveBeenLastCalledWith(["issue", "create", "--title", ISSUE_TITLE, "--body", issueBody(EVERYTHING)])
  })

  it("opens the issue when only a GitHub Action has a newer release", () => {
    const gh = fakeGh([])
    const actionsOnly: Updates = { ...NOTHING, actions: [ACTION_CHANGE] }

    expect(syncIssue(gh, actionsOnly)).toBe(ISSUE_ACTION.CREATED)
  })

  it("rewrites the open issue with the current updates", () => {
    const gh = fakeGh(OPEN)

    expect(syncIssue(gh, EVERYTHING)).toBe(ISSUE_ACTION.UPDATED)
    expect(gh).toHaveBeenLastCalledWith(["issue", "edit", String(ISSUE_NUMBER), "--body", issueBody(EVERYTHING)])
  })

  it("closes the open issue once everything is up to date", () => {
    const gh = fakeGh(OPEN)

    expect(syncIssue(gh, NOTHING)).toBe(ISSUE_ACTION.CLOSED)
    expect(gh).toHaveBeenLastCalledWith(["issue", "close", String(ISSUE_NUMBER), "--comment", UP_TO_DATE_COMMENT])
  })

  it("does nothing when everything is up to date and no issue is open", () => {
    const gh = fakeGh([])

    expect(syncIssue(gh, NOTHING)).toBe(ISSUE_ACTION.NONE)
    expect(gh).toHaveBeenCalledTimes(1)
  })

  it("fails when gh fails", () => {
    expect(() => syncIssue(fakeGh([], FAILED), NOTHING)).toThrow("gh issue list")
  })
})

const repository = (): string =>
  createSkillsRepository({
    dependencies: { [RESEND]: "^6.39.0" },
    files: { ".github/workflows/ci.yml": `steps:\n  - uses: ${CHECKOUT}@${"a".repeat(40)} # v7.0.0\n` },
    resolved: { [RESEND]: `${RESEND}@6.39.0` },
    skills: { [RESEND]: skill("r1", "063246e") },
  })

const latestOf = (): Promise<string> => Promise.resolve("6.40.0")

const releaseOf: LatestRelease = () => ({ commit: "b".repeat(40), version: "v7.0.1" })

describe("findUpdates", () => {
  it("lists the outdated packages, the skills the update changed and the GitHub Actions with a newer release", async () => {
    const root = repository()
    const updateSkills = (): number => {
      writeFileSync(join(root, SKILLS_LOCK), JSON.stringify({ skills: { [RESEND]: skill("r2", "abcdef1") }, version: 2 }))

      return PASSED
    }

    await expect(findUpdates({ latestOf, releaseOf, root, updateSkills })).resolves.toStrictEqual({
      actions: [ACTION_CHANGE],
      packages: [RANGE],
      skills: [SKILL_CHANGE],
    })
  })

  it("fails when the skills update fails", async () => {
    await expect(findUpdates({ latestOf, releaseOf, root: repository(), updateSkills: () => FAILED })).rejects.toThrow(
      `bun ${SKILLS_UPDATE_SCRIPT.join(" ")} failed`,
    )
  })
})

describe("writeUpdates and readUpdates", () => {
  it("hand the updates from the step that finds them to the step that writes the issue", () => {
    const path = join(createContentDirectory({}), "updates.json")
    writeUpdates(path, EVERYTHING)

    expect(readUpdates(path)).toStrictEqual(EVERYTHING)
  })
})
