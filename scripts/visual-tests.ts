import { readFileSync } from "node:fs"
import process from "node:process"
import { setTimeout as sleep } from "node:timers/promises"
import * as zod from "zod"

import { VISUAL_BROWSER_VARIABLE, VISUAL_PROJECT } from "../e2e/data/visual.ts"
import { SERVER_URL } from "../playwright.config.ts"
import { FAILURE_EXIT_CODE, runCommand, scriptArguments } from "./run-command.ts"

const VISUAL_BROWSER = {
  DISTRIBUTION: "noble",
  PLATFORM: "linux/amd64",
  PORT: 3000,
  REGISTRY: "mcr.microsoft.com/playwright",
  USER: "pwuser",
} as const

const INTERRUPTED_EXIT_CODE = 130
const POLL_INTERVAL_MS = 1000
const START_TIMEOUT_MS = 300_000
const READY_LINE = "Listening on ws://"
const PLAYWRIGHT_PACKAGE = "node_modules/@playwright/test/package.json"

const packageSchema = zod.object({ version: zod.string().regex(/^\d+\.\d+\.\d+$/u) })
const addressSchema = zod.string().regex(/^127\.0\.0\.1:\d+$/u)

export const visualBrowserImage = (version: string): string => `${VISUAL_BROWSER.REGISTRY}:v${version}-${VISUAL_BROWSER.DISTRIBUTION}`

const docker = (args: readonly string[]): string => {
  const { status, stdout } = runCommand("docker", args, { capture: true })
  if (status !== 0) {
    throw new Error(`docker ${args.join(" ")} exited with ${String(status)}`)
  }

  return stdout.trim()
}

const startBrowser = (version: string): string => {
  const image = visualBrowserImage(version)
  if (runCommand("docker", ["pull", "--quiet", "--platform", VISUAL_BROWSER.PLATFORM, image]).status !== 0) {
    throw new Error(`docker could not pull ${image}; start Docker and try again`)
  }

  return docker([
    "run",
    "--detach",
    "--rm",
    "--init",
    "--platform",
    VISUAL_BROWSER.PLATFORM,
    "--publish",
    `127.0.0.1::${String(VISUAL_BROWSER.PORT)}`,
    "--user",
    VISUAL_BROWSER.USER,
    "--workdir",
    `/home/${VISUAL_BROWSER.USER}`,
    image,
    "npx",
    "--yes",
    `playwright@${version}`,
    "run-server",
    "--port",
    String(VISUAL_BROWSER.PORT),
    "--host",
    "0.0.0.0",
  ])
}

const waitUntilListening = async (container: string, deadline: number): Promise<void> => {
  if (docker(["logs", container]).includes(READY_LINE)) {
    return
  }
  if (Date.now() > deadline) {
    throw new Error(`The browser server in ${container} did not start within ${String(START_TIMEOUT_MS)} ms`)
  }
  await sleep(POLL_INTERVAL_MS)
  await waitUntilListening(container, deadline)
}

const refuseRunningServer = async (): Promise<void> => {
  const answers = await fetch(SERVER_URL).then(
    () => true,
    () => false,
  )
  if (answers) {
    throw new Error(
      `A server already answers at ${SERVER_URL}. The visual tests compare the seeded test data, so stop that server and run them again: Playwright then resets the database, builds and starts its own.`,
    )
  }
}

const runVisualTests = async (): Promise<number> => {
  await refuseRunningServer()
  const { version } = packageSchema.parse(JSON.parse(readFileSync(PLAYWRIGHT_PACKAGE, "utf8")))
  const container = startBrowser(version)

  try {
    await waitUntilListening(container, Date.now() + START_TIMEOUT_MS)
    const address = addressSchema.parse(docker(["port", container, `${String(VISUAL_BROWSER.PORT)}/tcp`]).split("\n")[0])
    const env = { ...process.env, [VISUAL_BROWSER_VARIABLE]: `ws://${address}/` }

    return runCommand("bunx", ["playwright", "test", `--project=${VISUAL_PROJECT}`, ...scriptArguments()], { env }).status
  } finally {
    docker(["stop", container])
  }
}

if (import.meta.main) {
  process.on("SIGINT", () => {
    process.exitCode = INTERRUPTED_EXIT_CODE
  })
  process.exitCode = await runVisualTests().catch((error: unknown) => {
    console.error(error)
    return FAILURE_EXIT_CODE
  })
}
