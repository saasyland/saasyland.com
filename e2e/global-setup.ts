import { execFileSync } from "node:child_process"
import { realpathSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { SERVER_PORT } from "../playwright.config.ts"
import { LOCAL_SERVER } from "../src/data/local-server.ts"

const WORKTREE = realpathSync(fileURLToPath(new URL("..", import.meta.url)))

const lsof = (args: readonly string[]): string => execFileSync("lsof", ["-nP", ...args], { encoding: "utf8" })

export const foreignListeners = ({ directory, port }: { readonly directory: string; readonly port: string }): string[] => {
  const processIds = lsof([`-iTCP:${port}`, "-sTCP:LISTEN", "-t"]).trim().split("\n").join(",")
  const worktree = realpathSync(directory)

  return lsof(["-a", "-d", "cwd", "-Fn", "-p", processIds])
    .split("\n")
    .filter((line) => line.startsWith("n"))
    .map((line) => line.slice(1))
    .filter((listener) => listener !== worktree)
}

export default function refuseForeignServer(): void {
  const listeners = foreignListeners({ directory: WORKTREE, port: SERVER_PORT })

  if (listeners.length > 0) {
    throw new Error(
      `Port ${SERVER_PORT} is served from ${listeners.join(", ")}, not from this worktree, ${WORKTREE}, so the suite would test another build and database. Leave that server alone and run the suite on a free port: PLAYWRIGHT_BASE_URL=http://${LOCAL_SERVER.HOST}:<port> bun run test:e2e:pr.`,
    )
  }
}
