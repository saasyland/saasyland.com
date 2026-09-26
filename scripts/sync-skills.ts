import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, symlinkSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"
import { z } from "zod/v4"

const FAILURE_EXIT_CODE = 1

const GROUPS: Record<string, string> = {
  "Leonxlnx/taste-skill": "taste",
  "TanStack/router": "tanstack/router",
  "TanStack/table": "tanstack/table",
  "anthropics/skills": "anthropic",
  "better-auth/skills": "better-auth",
  "cloudflare/skills": "cloudflare",
  "coreyhaines31/marketingskills": "coreyhaines31",
  "mattpocock/skills": "matt-pocock",
  "pbakaus/impeccable": "impeccable",
  "polarsource/skills": "polar",
  "remotion-dev/skills": "remotion",
  "resend/resend-skills": "resend",
}

const START_PACKAGE = /^packages\/(?:react-start|start-[^/]+)\//u

const skillSchema = z.object({ skillPath: z.string().optional(), source: z.string().optional() })
const skillsLockSchema = z.object({ skills: z.record(z.string(), skillSchema).default({}) })

const resolveGroup = ({ skillPath = "", source = "" }: z.infer<typeof skillSchema>): string | undefined => {
  if (source === "TanStack/router" && START_PACKAGE.test(skillPath)) {
    return "tanstack/start"
  }

  return GROUPS[source]
}

const AGENTS_DIR = ".agents/skills"
const CLAUDE_DIR = ".claude/skills"

const { skills } = skillsLockSchema.parse(JSON.parse(readFileSync("skills-lock.json", "utf8")))

rmSync(AGENTS_DIR, { force: true, recursive: true })
rmSync(CLAUDE_DIR, { force: true, recursive: true })
rmSync("agent", { force: true, recursive: true })

const FIXED_PATH = "/usr/bin:/bin:/usr/sbin:/sbin"

const result = spawnSync(process.execPath, ["x", "--bun", "skills", "experimental_install"], {
  env: { ...process.env, PATH: FIXED_PATH },
  stdio: "inherit",
})

if (result.status !== 0) {
  console.error("✗ skills experimental_install failed")
  process.exit(result.status ?? FAILURE_EXIT_CODE)
}

const staging = join(AGENTS_DIR, ".staging")
mkdirSync(staging, { recursive: true })
for (const name of Object.keys(skills)) {
  if (existsSync(join(AGENTS_DIR, name))) {
    renameSync(join(AGENTS_DIR, name), join(staging, name))
  }
}

const grouped: string[] = []
const roots = new Set<string>()
const ungrouped: string[] = []
for (const [name, entry] of Object.entries(skills)) {
  const group = resolveGroup(entry)
  const staged = join(staging, name)

  if (!existsSync(staged)) {
    console.warn(`! ${name} was not restored by the skills CLI; run bunx skills add for it.`)
  } else if (group === undefined) {
    const source = entry.source ?? "unknown source"
    console.warn(`! ${name} (${source}) has no group mapping; leaving it at the top level.`)
    renameSync(staged, join(AGENTS_DIR, name))
    ungrouped.push(source)
  } else {
    mkdirSync(join(AGENTS_DIR, group), { recursive: true })
    renameSync(staged, join(AGENTS_DIR, group, name))
    roots.add(group.split("/")[0] ?? group)
    grouped.push(name)
  }
}

rmSync(staging, { force: true, recursive: true })

mkdirSync(CLAUDE_DIR, { recursive: true })
const groupRoots = [...roots].toSorted((left, right) => left.localeCompare(right))
for (const root of groupRoots) {
  symlinkSync(`../../${AGENTS_DIR}/${root}`, join(CLAUDE_DIR, root))
}

console.log(
  `\n✓ Restored ${Object.keys(skills).length} skills, grouped ${grouped.length}, linked ${groupRoots.join(", ")} into ${CLAUDE_DIR}.`,
)

if (ungrouped.length > 0) {
  const sources = [...new Set(ungrouped)].toSorted((left, right) => left.localeCompare(right)).join(", ")
  console.error(`\n✗ ${ungrouped.length} skills stayed at the top level. Add these sources to GROUPS: ${sources}`)
  process.exit(FAILURE_EXIT_CODE)
}
