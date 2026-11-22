import { readFileSync, writeFileSync } from "node:fs"
import process from "node:process"
import { z } from "zod/v4"

import {
  type LatestVersion,
  type OutdatedDependency,
  isUpdatedByCommand,
  latestVersion,
  outdatedDependencies,
  readDependencies,
} from "./dependencies.ts"
import { runCommand } from "./run-command.ts"
import { type SkillsLock, readSkillsLock } from "./skills-lock.ts"
import { SKILLS_UPDATE_SCRIPT } from "./sync-skills.ts"

export const ISSUE_TITLE = "Dependency and skills updates available"
export const UPDATE_COMMAND = "bun run deps:update"
export const UP_TO_DATE_COMMENT = "Every dependency and agent skill is on its latest version."

const SUCCESS_EXIT_CODE = 0
const SHORT_COMMIT_LENGTH = 7
const UNKNOWN_COMMIT = "unknown"

const SCRIPT_ARGUMENTS_START = 2

export const REPORT_MODE = { FIND: "find", ISSUE: "issue" } as const

const issuesSchema = z.array(z.object({ number: z.int(), title: z.string() }))
const argumentsSchema = z.tuple([z.enum(REPORT_MODE), z.string().min(1)])
const outdatedSchema = z.object({ latest: z.string(), name: z.string(), package: z.string(), spec: z.string(), version: z.string() })
const skillChangeSchema = z.object({ from: z.string(), name: z.string(), source: z.string(), to: z.string() })
const updatesSchema = z.object({ packages: z.array(outdatedSchema), skills: z.array(skillChangeSchema) })

export interface SkillChange {
  readonly from: string
  readonly name: string
  readonly source: string
  readonly to: string
}

export interface Updates {
  readonly packages: readonly OutdatedDependency[]
  readonly skills: readonly SkillChange[]
}

export interface GhResult {
  readonly status: number
  readonly stdout: string
}

export type Gh = (args: readonly string[]) => GhResult

export const ISSUE_ACTION = { CLOSED: "closed", CREATED: "created", NONE: "none", UPDATED: "updated" } as const

type IssueAction = (typeof ISSUE_ACTION)[keyof typeof ISSUE_ACTION]

const shortCommit = (commit: string | undefined): string => (commit ?? UNKNOWN_COMMIT).slice(0, SHORT_COMMIT_LENGTH)

export const changedSkills = (before: SkillsLock, after: SkillsLock): SkillChange[] =>
  Object.entries(before).flatMap(([name, entry]) => {
    const updated = after[name]

    if (updated === undefined || updated.computedHash === entry.computedHash) {
      return []
    }

    return [{ from: shortCommit(entry.commit), name, source: entry.source, to: shortCommit(updated.commit) }]
  })

const packageRow = (dependency: OutdatedDependency): string => {
  const how = isUpdatedByCommand(dependency) ? `\`${UPDATE_COMMAND}\`` : "by hand: pinned"

  return `| \`${dependency.name}\` | ${dependency.version} | ${dependency.latest} | ${how} |`
}

export const issueBody = ({ packages, skills }: Updates): string => {
  const sections = [
    `Run \`${UPDATE_COMMAND}\` on a branch, then \`bun run check\`, \`bun run test:coverage\` and \`bun run build:test\`. It updates the dependencies and the agent skills together. A pinned package moves by hand: read why it is pinned in the Dependencies docs first.`,
  ]

  if (packages.length > 0) {
    sections.push(
      [
        "## Packages",
        "",
        "| Package | Installed | Latest | Update |",
        "| --- | --- | --- | --- |",
        ...packages.map((dependency) => packageRow(dependency)),
      ].join("\n"),
    )
  }

  if (skills.length > 0) {
    sections.push(
      [
        "## Agent skills",
        "",
        "| Skill | Source | Locked | Latest |",
        "| --- | --- | --- | --- |",
        ...skills.map(({ from, name, source, to }) => `| \`${name}\` | \`${source}\` | ${from} | ${to} |`),
      ].join("\n"),
    )
  }

  return `${sections.join("\n\n")}\n`
}

const ghOutput = (gh: Gh, args: readonly string[]): string => {
  const { status, stdout } = gh(args)

  if (status !== SUCCESS_EXIT_CODE) {
    throw new Error(`gh ${args.join(" ")} failed`)
  }

  return stdout
}

export const syncIssue = (gh: Gh, updates: Updates): IssueAction => {
  const open = issuesSchema
    .parse(JSON.parse(ghOutput(gh, ["issue", "list", "--state", "open", "--search", `${ISSUE_TITLE} in:title`, "--json", "number,title"])))
    .find(({ title }) => title === ISSUE_TITLE)
  const pending = updates.packages.length > 0 || updates.skills.length > 0

  if (!pending) {
    if (open === undefined) {
      return ISSUE_ACTION.NONE
    }

    ghOutput(gh, ["issue", "close", String(open.number), "--comment", UP_TO_DATE_COMMENT])

    return ISSUE_ACTION.CLOSED
  }

  const body = issueBody(updates)

  if (open === undefined) {
    ghOutput(gh, ["issue", "create", "--title", ISSUE_TITLE, "--body", body])

    return ISSUE_ACTION.CREATED
  }

  ghOutput(gh, ["issue", "edit", String(open.number), "--body", body])

  return ISSUE_ACTION.UPDATED
}

export const findUpdates = async ({
  latestOf,
  root,
  updateSkills,
}: {
  latestOf: LatestVersion
  root: string
  updateSkills: () => number
}): Promise<Updates> => {
  const packages = await outdatedDependencies(readDependencies(root), latestOf)
  const before = readSkillsLock(root)

  if (updateSkills() !== SUCCESS_EXIT_CODE) {
    throw new Error(`bun ${SKILLS_UPDATE_SCRIPT.join(" ")} failed`)
  }

  return { packages, skills: changedSkills(before, readSkillsLock(root)) }
}

export const writeUpdates = (path: string, updates: Updates): void => {
  writeFileSync(path, JSON.stringify(updates))
}

export const readUpdates = (path: string): Updates => updatesSchema.parse(JSON.parse(readFileSync(path, "utf8")))

if (import.meta.main) {
  const [mode, path] = argumentsSchema.parse(process.argv.slice(SCRIPT_ARGUMENTS_START))

  if (mode === REPORT_MODE.FIND) {
    const root = process.cwd()
    const updates = await findUpdates({
      latestOf: latestVersion,
      root,
      updateSkills: () => runCommand(process.execPath, SKILLS_UPDATE_SCRIPT).status,
    })
    writeUpdates(path, updates)
    console.log(`${String(updates.packages.length)} packages and ${String(updates.skills.length)} skills have updates.`)
  } else {
    console.log(`Issue "${ISSUE_TITLE}": ${syncIssue((args) => runCommand("gh", args, { capture: true }), readUpdates(path))}.`)
  }
}
