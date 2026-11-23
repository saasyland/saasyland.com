import { spawnSync } from "node:child_process"
import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

import { FAILURE_EXIT_CODE } from "./run-command.ts"

export const HOOKS_DIRECTORY = ".vite-hooks"
export const DISPATCHER_DIRECTORY = `${HOOKS_DIRECTORY}/_`

const EXECUTABLE_BITS = 0o111
const GIT_SUCCESS = 0
const REPAIR_COMMAND = `git config --local core.hooksPath ${DISPATCHER_DIRECTORY} && bunx vp hooks enable`

const git = (args: readonly string[]): { output: string; succeeded: boolean } => {
  const { status, stdout } = spawnSync("git", args, { encoding: "utf8" })

  return { output: stdout.trim(), succeeded: status === GIT_SUCCESS }
}

const isExecutable = (path: string): boolean => {
  const stats = statSync(path, { throwIfNoEntry: false })

  return stats !== undefined && (stats.mode & EXECUTABLE_BITS) !== 0
}

export const gitHookProblems = ({ hooksPath, root }: { hooksPath: string; root: string }): string[] => {
  const hooks = readdirSync(join(root, HOOKS_DIRECTORY), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map(({ name }) => name)
    .toSorted()
  const pathProblems = hooksPath === DISPATCHER_DIRECTORY ? [] : [`core.hooksPath is "${hooksPath}" instead of "${DISPATCHER_DIRECTORY}"`]
  const missingHooks = hooks.filter((hook) => !isExecutable(join(root, DISPATCHER_DIRECTORY, hook)))

  return [
    ...pathProblems,
    ...missingHooks.map((hook) => `${DISPATCHER_DIRECTORY}/${hook} is missing or not executable, so Git skips the ${hook} hook`),
  ]
}

if (import.meta.main) {
  const toplevel = git(["rev-parse", "--show-toplevel"])

  if (toplevel.succeeded) {
    const problems = gitHookProblems({ hooksPath: git(["config", "--get", "core.hooksPath"]).output, root: toplevel.output })

    if (problems.length > 0) {
      process.stderr.write(
        `\n❌  Git does not run the commit hooks of ${toplevel.output}:\n   ${problems.join("\n   ")}\n   Run: ${REPAIR_COMMAND}\n\n`,
      )
      process.exit(FAILURE_EXIT_CODE)
    }
  }
}
