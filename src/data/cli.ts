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

export const CLI_PACKAGE = "saasyland"

export const CLI_RELEASE_CHANNEL = NPM_DIST_TAG.BETA

export const CLI_PACKAGE_SPEC = `${CLI_PACKAGE}@${CLI_RELEASE_CHANNEL}`

export const CLI_EXEC = `${PACKAGE_MANAGER.NPM.exec} ${CLI_PACKAGE_SPEC}`

export const CLI_COMMAND = {
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
  INIT: "init",
  WHOAMI: "whoami",
} as const

type CliCommand = (typeof CLI_COMMAND)[keyof typeof CLI_COMMAND]

export const cliCommand = (command: CliCommand): string => `${CLI_EXEC} ${command}`

export const CLI_LICENSE_COMMANDS = [CLI_COMMAND.ACTIVATE, CLI_COMMAND.WHOAMI, CLI_COMMAND.DEACTIVATE] as const

export const CLI_LICENSE_KEY_VARIABLE = "SAASYLAND_LICENSE_KEY"

export const CLI_API_URL_VARIABLE = "SAASYLAND_API_URL"

export const CLI_LOCALE_VARIABLE = "SAASYLAND_LOCALE"

export const CLI_EXIT_CODE = {
  CANCELLED: 130,
  FAILURE: 1,
  NOT_AVAILABLE: 69,
  NO_PERMISSION: 77,
  PROTOCOL: 76,
  SUCCESS: 0,
  TEMPORARY_FAILURE: 75,
  USAGE: 2,
} as const

export const CLI_CREDENTIALS_FILE = "credentials.json"

export const CLI_CREDENTIALS_FILE_MODE = 0o600

const WINDOWS_PATH_SEPARATOR = "\\"

export const CLI_CREDENTIALS_DIRECTORY = {
  LINUX: `$XDG_CONFIG_HOME/${CLI_PACKAGE}`,
  LINUX_FALLBACK: `~/.config/${CLI_PACKAGE}`,
  MACOS: `~/Library/Preferences/${CLI_PACKAGE}`,
  WINDOWS: ["%APPDATA%", CLI_PACKAGE, "Config"].join(WINDOWS_PATH_SEPARATOR),
} as const

export const SCAFFOLD_DIR = "my-app"

export const SCAFFOLD_TARGET = `${CLI_PACKAGE_SPEC} ${CLI_COMMAND.INIT} ${SCAFFOLD_DIR}`

export const CLI_INIT_COMMAND = `${PACKAGE_MANAGER.NPM.exec} ${SCAFFOLD_TARGET}`

export const CLI_GENERATION: FeatureStatus = FEATURE_STATUS.ARRIVING

export const CLI_GENERATION_VALUES: { readonly generation: FeatureStatus; readonly initCommand: string } = {
  generation: CLI_GENERATION,
  initCommand: CLI_INIT_COMMAND,
}

export const CLI_GROUPS = ["platform", "data", "product", "extras"] as const

export const CLI_CHOICES = [
  {
    group: "platform",
    id: "framework",
    options: [
      { flag: "--framework tanstack", id: "tanstack" },
      { flag: "--framework next", id: "next" },
      { flag: "--framework react-router", id: "react-router" },
    ],
  },
  {
    group: "platform",
    id: "architecture",
    options: [
      { flag: "--arch monolith", id: "monolith" },
      { flag: "--arch split", id: "split" },
      { flag: "--arch microservices", id: "microservices" },
    ],
  },
  {
    group: "platform",
    id: "deployment",
    options: [
      { flag: "--deploy cloudflare", id: "cloudflare" },
      { flag: "--deploy vercel", id: "vercel" },
      { flag: "--deploy self", id: "self" },
    ],
  },
  {
    group: "platform",
    id: "api",
    options: [
      { flag: "--api hono", id: "hono", unavailableWhen: { architecture: ["monolith"] } },
      { flag: "--api elysia", id: "elysia", unavailableWhen: { architecture: ["monolith"], deployment: ["cloudflare"] } },
    ],
  },
  {
    group: "platform",
    id: "runtime",
    options: [
      { flag: "--runtime node", id: "node" },
      { flag: "--runtime bun", id: "bun", unavailableWhen: { deployment: ["cloudflare"] } },
    ],
  },
  {
    group: "data",
    id: "database",
    options: [
      { flag: "--db sqlite", id: "sqlite", unavailableWhen: { deployment: ["vercel"] } },
      { flag: "--db postgres", id: "postgres" },
    ],
  },
  {
    group: "data",
    id: "provider",
    options: [
      { flag: "--provider d1", id: "d1", unavailableWhen: { database: ["postgres"], deployment: ["self"] } },
      { flag: "--provider turso", id: "turso", unavailableWhen: { database: ["postgres"] } },
      { flag: "--provider file", id: "file", unavailableWhen: { database: ["postgres"], deployment: ["cloudflare"] } },
      { flag: "--provider neon", id: "neon", unavailableWhen: { database: ["sqlite"] } },
      { flag: "--provider supabase", id: "supabase", unavailableWhen: { database: ["sqlite"] } },
      { flag: "--provider self", id: "self-postgres", unavailableWhen: { database: ["sqlite"] } },
    ],
  },
  {
    group: "data",
    id: "orm",
    options: [
      { flag: "--orm drizzle", id: "drizzle" },
      { flag: "--orm prisma", id: "prisma" },
    ],
  },
  {
    group: "product",
    id: "tenancy",
    options: [
      { flag: "--tenancy single", id: "single" },
      { flag: "--tenancy multi", id: "multi" },
    ],
  },
  {
    group: "product",
    id: "auth",
    options: [
      { flag: "--auth better-auth", id: "better-auth" },
      { flag: "--no-auth", id: "none" },
    ],
  },
  {
    group: "product",
    id: "email",
    options: [
      { flag: "--email resend", id: "resend" },
      { flag: "--email plunk", id: "plunk" },
      { flag: "--no-email", id: "none" },
    ],
  },
  {
    group: "product",
    id: "billing",
    options: [
      { flag: "--billing polar", id: "polar" },
      { flag: "--billing stripe", id: "stripe" },
      { flag: "--billing lemonsqueezy", id: "lemonsqueezy" },
      { flag: "--no-billing", id: "none" },
    ],
  },
  {
    group: "product",
    id: "content",
    options: [
      { flag: "--content mdx", id: "mdx" },
      { flag: "--no-content", id: "none" },
    ],
  },
] as const

export const CLI_EXTRAS = [
  { flag: "--with commerce", id: "commerce", module: "commerce", unavailableWhen: { billing: ["none"] } },
  { flag: "--with courses", id: "courses", module: "courses", unavailableWhen: { billing: ["none"] } },
  { flag: "--with page-builder", id: "page-builder", module: "builder" },
  { flag: "--with post-editor", id: "post-editor", module: "editor", unavailableWhen: { content: ["none"] } },
] as const

export const NONE = "none"

type CliChoice = (typeof CLI_CHOICES)[number]

interface CliTemplateSupport {
  readonly choices: Readonly<Record<CliChoice["id"], readonly string[]>>
  readonly extras: readonly (typeof CLI_EXTRAS)[number]["id"][]
}

export const CLI_TEMPLATE_SUPPORT: CliTemplateSupport = {
  choices: {
    api: [],
    architecture: ["monolith"],
    auth: ["better-auth", NONE],
    billing: [NONE],
    content: ["mdx"],
    database: ["sqlite"],
    deployment: ["cloudflare"],
    email: ["resend"],
    framework: ["tanstack"],
    orm: ["drizzle"],
    provider: ["d1"],
    runtime: ["node"],
    tenancy: ["single"],
  },
  extras: [],
}

export type CliAnswers = Readonly<Record<string, string>>

export interface CliOption {
  readonly id: string
  readonly unavailableWhen?: Readonly<Record<string, readonly string[]>> | undefined
}

export const isCliOptionAvailable = (option: CliOption, answers: CliAnswers): boolean =>
  !Object.entries(option.unavailableWhen ?? {}).some(([choiceId, blocked]) => blocked.some((optionId) => optionId === answers[choiceId]))

export const isCliOptionSelectable = (option: CliOption, supported: readonly string[], answers: CliAnswers): boolean =>
  supported.includes(option.id) && isCliOptionAvailable(option, answers)

export const resolveCliAnswers = (answers: CliAnswers, supported: CliTemplateSupport["choices"]): CliAnswers => {
  const resolved: Record<string, string> = {}
  for (const choice of CLI_CHOICES) {
    const selectable = choice.options.filter((option) => isCliOptionSelectable(option, supported[choice.id], resolved))
    const kept = selectable.find((option) => option.id === answers[choice.id]) ?? selectable[0]
    if (kept !== undefined) {
      resolved[choice.id] = kept.id
    }
  }
  return resolved
}

export const cliFlags = (answers: CliAnswers): string[] =>
  CLI_CHOICES.flatMap((choice) => choice.options.filter((option) => option.id === answers[choice.id]).map((option) => option.flag))

export const CLI_MODULES = [
  { choiceId: "auth", id: "auth" },
  { id: "database" },
  { choiceId: "billing", id: "billing" },
  { choiceId: "email", id: "email" },
  { id: "admin" },
  { id: "ui" },
  { id: "i18n" },
  { choiceId: "content", id: "content" },
  { id: "tests" },
  { id: "tooling" },
] as const
