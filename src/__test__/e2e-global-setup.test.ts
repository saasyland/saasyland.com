import { spawn } from "node:child_process"
import { mkdtempSync, realpathSync, rmSync } from "node:fs"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, onTestFinished } from "vite-plus/test"
import * as zod from "zod"

import { LOCAL_SERVER } from "~/src/data/local-server"

import { foreignListeners } from "~/e2e/global-setup"

const LISTENER_SCRIPT = `require("node:net").createServer().listen(0, "${LOCAL_SERVER.HOST}", function () { console.log(this.address().port) })`

const listenHere = async (): Promise<string> => {
  const server = createServer()

  onTestFinished(() => {
    server.close()
  })
  await new Promise<void>((resolve) => {
    server.listen(0, LOCAL_SERVER.HOST, resolve)
  })

  return String(zod.object({ port: zod.number() }).parse(server.address()).port)
}

const listenIn = (directory: string): Promise<string> => {
  const listener = spawn(process.execPath, ["-e", LISTENER_SCRIPT], { cwd: directory })

  onTestFinished(() => {
    listener.kill()
  })

  return new Promise((resolve) => {
    listener.stdout.once("data", (chunk) => {
      resolve(String(chunk).trim())
    })
  })
}

describe("browser suite global setup", () => {
  it("accepts a server that runs in this worktree", async () => {
    expect(foreignListeners({ directory: process.cwd(), port: await listenHere() })).toStrictEqual([])
  })

  it("names the directory of a server another worktree started on the port", async () => {
    const directory = mkdtempSync(join(tmpdir(), "other-worktree-"))

    onTestFinished(() => {
      rmSync(directory, { force: true, recursive: true })
    })

    expect(foreignListeners({ directory: process.cwd(), port: await listenIn(directory) })).toStrictEqual([realpathSync(directory)])
  })
})
