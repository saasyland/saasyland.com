import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdir, readFile, readdir, stat } from "node:fs/promises"
import { join, sep } from "node:path"
import process from "node:process"

import { API_ERROR, API_FAILURE, CI_REPOSITORY_VARIABLE, apiZodSchemas } from "@saasyland/stack/api"
import * as zod from "zod"

import { I18N } from "../../src/integrations/use-intl/i18n.config"

import { CLI_LICENSE_KEY_VARIABLE, CLI_PACKAGE_SPEC, PACKAGE_MANAGER } from "../../src/data/cli"

export const CLI_RESULT = {
  ACTIVATED: "activated",
  ALREADY_ACTIVATED: "alreadyActivated",
  DEACTIVATED: "deactivated",
  LICENSE_ACTIVE: "licenseActive",
} as const

export const CLI_ERROR = {
  ...API_ERROR,
  NOT_ACTIVATED: "notActivated",
} as const

export const CLI_EXIT_CODE = {
  NO_PERMISSION: 77,
  SUCCESS: 0,
} as const

const CLI_STATUS = {
  ERROR: "error",
  SUCCESS: "success",
} as const

const CLI_VARIABLE = {
  API_URL: "SAASYLAND_API_URL",
  LOCALE: "SAASYLAND_LOCALE",
} as const

export const PRIVATE_FILE_MODE = 0o600

const CREDENTIALS_PATH = join("saasyland", "credentials.json")
const PERMISSION_BITS = 0o777

const outputSchema = zod.discriminatedUnion("status", [
  zod.object({
    activationId: apiZodSchemas.activationId,
    license: apiZodSchemas.license.optional(),
    machines: zod.array(apiZodSchemas.machine).optional(),
    result: zod.enum(CLI_RESULT),
    status: zod.literal(CLI_STATUS.SUCCESS),
  }),
  zod.object({
    api: apiZodSchemas.error.or(zod.object({ code: zod.literal(API_FAILURE.UNEXPECTED_RESPONSE), status: zod.int() })).optional(),
    reason: zod.string(),
    status: zod.literal(CLI_STATUS.ERROR),
  }),
])

const credentialsSchema = apiZodSchemas.credentials.extend({ activationId: apiZodSchemas.activationId })

export interface Machine {
  readonly env: Readonly<Record<string, string>>
  readonly home: string
}

interface MachineOptions {
  readonly apiUrl: string
  readonly home: string
  readonly licenseKey?: string
  readonly npmCache: string
  readonly repository?: string
}

interface CliRun {
  readonly exitCode: number | null
  readonly output: zod.infer<typeof outputSchema>
}

interface StoredCredentials {
  readonly credentials: zod.infer<typeof credentialsSchema>
  readonly mode: number
}

export const createMachine = async ({ apiUrl, home, licenseKey, npmCache, repository }: MachineOptions): Promise<Machine> => {
  await mkdir(home, { recursive: true })

  return {
    env: {
      HOME: home,
      PATH: process.env["PATH"] ?? "",
      [CLI_VARIABLE.API_URL]: apiUrl,
      [CLI_VARIABLE.LOCALE]: I18N.DEFAULT_LOCALE,
      npm_config_cache: npmCache,
      npm_config_update_notifier: String(false),
      ...(licenseKey === undefined ? {} : { [CLI_LICENSE_KEY_VARIABLE]: licenseKey }),
      ...(repository === undefined ? {} : { [CI_REPOSITORY_VARIABLE]: repository }),
    },
    home,
  }
}

const lastLine = (text: string): string => text.trim().split("\n").at(-1) ?? ""

const parsedJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export const runCli = async ({ env, home }: Machine, inputs: readonly string[]): Promise<CliRun> => {
  const variables = Object.entries(env).map(([name, value]) => `${name}=${value}`)
  const child = spawn("env", ["-i", ...variables, PACKAGE_MANAGER.NPM.exec, "--yes", CLI_PACKAGE_SPEC, ...inputs, "--json"], { cwd: home })
  const stdout: Buffer[] = []
  const stderr: Buffer[] = []
  child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk))
  child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk))
  const [code] = await once(child, "close")
  const exitCode = zod.int().nullable().parse(code)
  const printed = Buffer.concat(exitCode === CLI_EXIT_CODE.SUCCESS ? stdout : stderr).toString("utf8")
  const output = outputSchema.safeParse(parsedJson(lastLine(printed)))

  if (!output.success) {
    throw new Error(`saasyland ${inputs.join(" ")} exited with ${String(exitCode)} and printed:\n${printed}`)
  }

  return { exitCode, output: output.data }
}

export const storedCredentials = async ({ home }: Machine): Promise<StoredCredentials | undefined> => {
  const [path] = (await readdir(home, { recursive: true })).filter((entry) => `${sep}${entry}`.endsWith(`${sep}${CREDENTIALS_PATH}`))

  if (path === undefined) {
    return undefined
  }

  const file = join(home, path)

  return {
    credentials: credentialsSchema.parse(JSON.parse(await readFile(file, "utf8"))),
    mode: (await stat(file)).mode & PERMISSION_BITS,
  }
}
