import { getRequest } from "@tanstack/react-start/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { getStoredTheme, isThemeSelection } from "~/src/providers/theme-provider"

import { THEME } from "~/src/presentation/theme"

describe("theme value guard", () => {
  it("accepts known theme keys", () => {
    expect.hasAssertions()
    expect(isThemeSelection("light")).toBe(true)
    expect(isThemeSelection("dark")).toBe(true)
    expect(isThemeSelection("system")).toBe(true)
  })

  it("rejects non-string and unknown keys", () => {
    expect.hasAssertions()
    expect(isThemeSelection(Number.NaN)).toBe(false)
    expect(isThemeSelection("invalid-theme")).toBe(false)
    expect(isThemeSelection(JSON_NULL)).toBe(false)
  })
})

describe("stored theme", () => {
  it.each([
    ["dark", "dark"],
    ["light", "light"],
    ["unknown", "system"],
  ])("reads %s from the theme cookie as %s", (stored, theme) => {
    vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/", { headers: { cookie: `${THEME.COOKIE_NAME}=${stored}` } }))
    expect(getStoredTheme()).toBe(theme)
  })

  it("uses the default theme without a cookie", () => {
    expect(getStoredTheme()).toBe(THEME.DEFAULT_THEME)
  })
})
