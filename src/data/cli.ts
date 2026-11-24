import type { Stack } from "@saasyland/stack"
import { CLI_NAME, TEMPLATE_SUPPORT } from "@saasyland/stack/cli"

import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

export const NPM_DIST_TAG = {
  BETA: "beta",
  LATEST: "latest",
} as const

export const PACKAGE_MANAGER = {
  BUN: { dev: "bun dev", exec: "bunx", id: "bun" },
  NPM: { dev: "npm run dev", exec: "npx", id: "npm" },
  PNPM: { dev: "pnpm dev", exec: "pnpm dlx", id: "pnpm" },
  YARN: { dev: "yarn dev", exec: "yarn dlx", id: "yarn" },
} as const

export const PACKAGE_MANAGERS = [PACKAGE_MANAGER.BUN, PACKAGE_MANAGER.NPM, PACKAGE_MANAGER.PNPM, PACKAGE_MANAGER.YARN] as const

export const CLI_PACKAGE = CLI_NAME

export const CLI_RELEASE_CHANNEL = NPM_DIST_TAG.BETA

export const CLI_PACKAGE_SPEC = `${CLI_PACKAGE}@${CLI_RELEASE_CHANNEL}`

export const CLI_EXEC = `${PACKAGE_MANAGER.NPM.exec} ${CLI_PACKAGE_SPEC}`

export const CLI_COMMAND = {
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
  INIT: "init",
  WHOAMI: "whoami",
} as const

export type CliCommand = (typeof CLI_COMMAND)[keyof typeof CLI_COMMAND]

export const SCAFFOLD_DIR = "my-app"

export const SCAFFOLD_TARGET = `${CLI_PACKAGE_SPEC} ${CLI_COMMAND.INIT} ${SCAFFOLD_DIR}`

export const CLI_INIT_COMMAND = `${PACKAGE_MANAGER.NPM.exec} ${SCAFFOLD_TARGET}`

const ACTIVATE_LINE = { command: `${CLI_EXEC} ${CLI_COMMAND.ACTIVATE}`, id: CLI_COMMAND.ACTIVATE } as const

const INIT_LINE = { command: CLI_INIT_COMMAND, id: CLI_COMMAND.INIT } as const

export const CLI_SETUP_LINES = [ACTIVATE_LINE, INIT_LINE] as const

export const CLI_KEY_LINES = [
  ACTIVATE_LINE,
  INIT_LINE,
  { command: `${CLI_EXEC} ${CLI_COMMAND.WHOAMI}`, id: CLI_COMMAND.WHOAMI },
  { command: `${CLI_EXEC} ${CLI_COMMAND.DEACTIVATE}`, id: CLI_COMMAND.DEACTIVATE },
] as const

export const CLI_GENERATION: FeatureStatus = FEATURE_STATUS.AVAILABLE

export const CLI_GENERATION_VALUES: { readonly generation: FeatureStatus; readonly initCommand: string } = {
  generation: CLI_GENERATION,
  initCommand: CLI_INIT_COMMAND,
}

export const CLI_TEMPLATE_SUPPORT: Stack["support"] = TEMPLATE_SUPPORT
