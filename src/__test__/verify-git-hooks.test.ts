import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, onTestFinished } from "vite-plus/test"
import { z } from "zod/v4"

import { DISPATCHER_DIRECTORY, HOOKS_DIRECTORY, gitHookProblems } from "~/scripts/verify-git-hooks"

const PRE_COMMIT = "pre-commit"
const PROJECT_HOOKS = ["post-checkout", PRE_COMMIT, "prepare-commit-msg"]
const EXECUTABLE_MODE = 0o755
const READ_ONLY_MODE = 0o644
const MAIN_CHECKOUT_DISPATCHER = "/home/developer/saasyland/.vite-hooks/_"

const { scripts } = z.object({ scripts: z.record(z.string(), z.string()) }).parse(JSON.parse(readFileSync("package.json", "utf8")))

const createCheckout = ({ dispatcherHooks }: { dispatcherHooks: readonly string[] }): string => {
  const root = mkdtempSync(join(tmpdir(), "git-hooks-"))

  onTestFinished(() => {
    rmSync(root, { force: true, recursive: true })
  })
  mkdirSync(join(root, DISPATCHER_DIRECTORY), { recursive: true })

  for (const hook of PROJECT_HOOKS) {
    writeFileSync(join(root, HOOKS_DIRECTORY, hook), "")
  }

  for (const hook of dispatcherHooks) {
    writeFileSync(join(root, DISPATCHER_DIRECTORY, hook), "", { mode: EXECUTABLE_MODE })
  }

  return root
}

describe("verify-git-hooks", () => {
  it("accepts a checkout whose dispatcher Git runs for every project hook", () => {
    expect(gitHookProblems({ hooksPath: DISPATCHER_DIRECTORY, root: createCheckout({ dispatcherHooks: PROJECT_HOOKS }) })).toStrictEqual([])
  })

  it("fails a worktree without its own dispatcher, which Git skips without a word", () => {
    expect(gitHookProblems({ hooksPath: DISPATCHER_DIRECTORY, root: createCheckout({ dispatcherHooks: [] }) })).toStrictEqual(
      PROJECT_HOOKS.map((hook) => `${DISPATCHER_DIRECTORY}/${hook} is missing or not executable, so Git skips the ${hook} hook`),
    )
  })

  it("fails a hooks path that points at another checkout's dispatcher, which made Vite+ skip every worktree", () => {
    expect(
      gitHookProblems({ hooksPath: MAIN_CHECKOUT_DISPATCHER, root: createCheckout({ dispatcherHooks: PROJECT_HOOKS }) }),
    ).toStrictEqual([`core.hooksPath is "${MAIN_CHECKOUT_DISPATCHER}" instead of "${DISPATCHER_DIRECTORY}"`])
  })

  it("fails a dispatcher hook that Git cannot execute", () => {
    const root = createCheckout({ dispatcherHooks: PROJECT_HOOKS })

    chmodSync(join(root, DISPATCHER_DIRECTORY, PRE_COMMIT), READ_ONLY_MODE)

    expect(gitHookProblems({ hooksPath: DISPATCHER_DIRECTORY, root })).toStrictEqual([
      `${DISPATCHER_DIRECTORY}/${PRE_COMMIT} is missing or not executable, so Git skips the ${PRE_COMMIT} hook`,
    ])
  })

  it("installs the dispatcher and verifies it before anything else when dependencies are installed", () => {
    expect(scripts["prepare"]).toMatch(/^vp config --no-agent && bun scripts\/verify-git-hooks\.ts && /u)
  })

  it("installs the dispatcher of a new worktree before anything else the checkout hook does", () => {
    const [firstLine] = readFileSync(join(HOOKS_DIRECTORY, "post-checkout"), "utf8").split("\n")

    expect(firstLine).toBe(`[ -f ${DISPATCHER_DIRECTORY}/${PRE_COMMIT} ] || vp hooks enable`)
  })
})
