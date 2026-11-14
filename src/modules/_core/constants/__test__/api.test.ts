import { describe, expect, it } from "vite-plus/test"

import { ENVIRONMENT, appHostsForMode, isLocalMode } from "~/src/modules/_core/constants/api"

describe("deployment hosts by build mode", () => {
  it("trusts only the production domain in production", () => {
    expect(appHostsForMode(ENVIRONMENT.PRODUCTION)).toEqual(["saasyland.com"])
  })

  it("trusts only the preview subdomain in preview", () => {
    expect(appHostsForMode(ENVIRONMENT.PREVIEW)).toEqual(["preview.saasyland.com"])
  })

  it.each([ENVIRONMENT.DEVELOPMENT, "unknown"])("falls back to the loopback hosts in %s mode", (mode) => {
    expect(appHostsForMode(mode)).toEqual(["localhost:3000", "127.0.0.1:3000"])
  })

  it("also trusts the second test server port in test mode, for a browser suite run beside a dev server", () => {
    expect(appHostsForMode(ENVIRONMENT.TEST)).toEqual(["localhost:3000", "127.0.0.1:3000", "localhost:3020", "127.0.0.1:3020"])
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
