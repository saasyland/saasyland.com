import process from "node:process"
import { describe, expect, it } from "vite-plus/test"

import { FAILURE_EXIT_CODE, runCommand } from "~/scripts/run-command"

const EXIT_CODE = 3

describe("runCommand", () => {
  it("returns the exit status and, when asked to capture it, the output", () => {
    expect(
      runCommand(process.execPath, ["-e", `process.stdout.write("out"); process.exit(${String(EXIT_CODE)})`], { capture: true }),
    ).toStrictEqual({
      status: EXIT_CODE,
      stdout: "out",
    })
  })

  it("passes the output through and the environment it is given", () => {
    expect(
      runCommand(process.execPath, ["-e", "process.exit(Number(process.env.EXIT_WITH))"], { env: { ...process.env, EXIT_WITH: "0" } }),
    ).toStrictEqual({
      status: 0,
      stdout: "",
    })
    expect(runCommand(process.execPath, ["-e", ""])).toStrictEqual({ status: 0, stdout: "" })
  })

  it("reports a command killed by a signal as a failure", () => {
    expect(runCommand(process.execPath, ["-e", 'process.kill(process.pid, "SIGKILL")'], { capture: true }).status).toBe(FAILURE_EXIT_CODE)
  })
})
