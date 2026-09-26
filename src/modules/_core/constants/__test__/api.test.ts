import { describe, expect, it } from "vite-plus/test"

import { appHostsForMode, isLocalMode } from "~/src/modules/_core/constants/api"

describe("deployment hosts by build mode", () => {
  it("trusts only the production domain in production", () => {
    expect(appHostsForMode("production")).toEqual(["saasyland.com"])
  })

  it("trusts only the preview subdomain in preview", () => {
    expect(appHostsForMode("preview")).toEqual(["preview.saasyland.com"])
  })

  it.each(["development", "test", "unknown"])("falls back to the loopback hosts in %s mode", (mode) => {
    expect(appHostsForMode(mode)).toEqual(["localhost:3000", "127.0.0.1:3000"])
  })

  it("returns a fresh list each time so callers can extend it", () => {
    expect(appHostsForMode("test")).not.toBe(appHostsForMode("test"))
  })
})

describe("local build modes", () => {
  it.each(["development", "test"])("treats %s as local", (mode) => {
    expect(isLocalMode(mode)).toBe(true)
  })

  it.each(["preview", "production", "unknown"])("treats %s as deployed", (mode) => {
    expect(isLocalMode(mode)).toBe(false)
  })
})
