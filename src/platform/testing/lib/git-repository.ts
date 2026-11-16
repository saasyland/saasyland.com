import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { onTestFinished } from "vite-plus/test"

import { CHANGELOG_DIRECTORY } from "~/src/lib/changelog"

const SETTINGS = [
  "-c",
  "user.name=SaaSy Land",
  "-c",
  "user.email=tests@saasyland.com",
  "-c",
  "commit.gpgsign=false",
  "-c",
  "core.hooksPath=/dev/null",
]

const git = (cwd: string, args: readonly string[], env: Readonly<Record<string, string>> = {}): string =>
  execFileSync("git", [...SETTINGS, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } }).trim()

export interface GitRepository {
  readonly cloneShallow: () => string
  readonly commit: (subject: string, committedAt: string) => string
  readonly path: string
  readonly writeEntry: (file: string, source: string) => void
}

export const createGitRepository = (): GitRepository => {
  const path = mkdtempSync(join(tmpdir(), "changelog-"))
  const clone = `${path}-shallow`

  onTestFinished(() => {
    rmSync(path, { force: true, recursive: true })
    rmSync(clone, { force: true, recursive: true })
  })
  git(path, ["init", "--quiet", "--initial-branch=main"])

  return {
    cloneShallow: () => {
      git(tmpdir(), ["clone", "--quiet", "--depth=1", `file://${path}`, clone])

      return clone
    },
    commit: (subject, committedAt) => {
      git(path, ["add", "--all"])
      git(path, ["commit", "--quiet", "--allow-empty", `--message=${subject}`], {
        GIT_AUTHOR_DATE: committedAt,
        GIT_COMMITTER_DATE: committedAt,
      })

      return git(path, ["rev-parse", "HEAD"])
    },
    path,
    writeEntry: (file, source) => {
      mkdirSync(join(path, CHANGELOG_DIRECTORY), { recursive: true })
      writeFileSync(join(path, CHANGELOG_DIRECTORY, file), source)
    },
  }
}
