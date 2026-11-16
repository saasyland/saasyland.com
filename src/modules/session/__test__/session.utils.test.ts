import { describe, expect, it } from "vite-plus/test"

import { isMobileSession, sessionDeviceLabel } from "~/src/modules/session/session.utils"

describe("session device", () => {
  it.each([
    [{ ipAddress: "192.0.2.1", userAgent: "Firefox" }, "Firefox"],
    [{ ipAddress: "192.0.2.1", userAgent: "" }, "192.0.2.1"],
    [{ ipAddress: "192.0.2.1" }, "192.0.2.1"],
    [{ ipAddress: "", userAgent: "" }, undefined],
    [{}, undefined],
  ])("names the device of %o as %s", (session, label) => {
    expect(sessionDeviceLabel(session)).toBe(label)
  })

  it.each([
    [{ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }, true],
    [{ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)" }, false],
    [{}, false],
  ])("tells whether %o signed in on a phone or tablet", (session, isMobile) => {
    expect(isMobileSession(session)).toBe(isMobile)
  })
})
