import { describe, expect, it } from "vite-plus/test"

import { ENVIRONMENT, appHostsForMode, isLocalMode } from "~/src/modules/_core/constants/api"

import { APP_DOMAIN, APP_PREVIEW_DOMAIN } from "~/src/presentation/branding"

describe("deployment hosts by build mode", () => {
  it("trusts only the production domain of the branding in production", () => {
    expect(appHostsForMode(ENVIRONMENT.PRODUCTION)).toEqual([APP_DOMAIN])
  })

  it("trusts only the preview domain of the branding in preview", () => {
    expect(appHostsForMode(ENVIRONMENT.PREVIEW)).toEqual([APP_PREVIEW_DOMAIN])
  })

  it.each([ENVIRONMENT.DEVELOPMENT, "unknown"])("falls back to the loopback hosts in %s mode", (mode) => {
    expect(appHostsForMode(mode)).toEqual(["localhost:3000", "127.0.0.1:3000"])
  })

  it("also trusts the test server ports in test mode, so worktrees can run browser suites side by side", () => {
    expect(appHostsForMode(ENVIRONMENT.TEST)).toEqual(
      [3000, 3020, 3021, 3022, 3023, 3024, 3025, 3026, 3027, 3028, 3029].flatMap((port) => [
        `localhost:${String(port)}`,
        `127.0.0.1:${String(port)}`,
      ]),
    )
  })

  it.each(["127.0.0.1:3019", "127.0.0.1:3030", "0.0.0.0:3027"])("does not trust %s in test mode", (host) => {
    expect(appHostsForMode(ENVIRONMENT.TEST)).not.toContain(host)
  })

  it("returns a fresh list each time so callers can extend it", () => {
    expect(appHostsForMode(ENVIRONMENT.TEST)).not.toBe(appHostsForMode(ENVIRONMENT.TEST))
  })
})

describe("local build modes", () => {
  it.each([ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.TEST])("treats %s as local", (mode) => {
    expect(isLocalMode(mode)).toBe(true)
  })

  it.each([ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION, "unknown"])("treats %s as deployed", (mode) => {
    expect(isLocalMode(mode)).toBe(false)
  })
})
