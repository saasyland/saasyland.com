import { spawnSync } from "node:child_process"
import process from "node:process"

const FAILURE_EXIT_CODE = 1

export interface CommandResult {
  readonly status: number
  readonly stdout: string
}

export interface CommandOptions {
  readonly capture?: boolean
  readonly env?: NodeJS.ProcessEnv
}

export const runCommand = (
  command: string,
  args: readonly string[],
  { capture = false, env = process.env }: CommandOptions = {},
): CommandResult => {
  const { status, stdout } = spawnSync(command, args, { encoding: "utf8", env, stdio: capture ? "pipe" : "inherit" })

  return { status: status ?? FAILURE_EXIT_CODE, stdout: capture ? stdout : "" }
}
