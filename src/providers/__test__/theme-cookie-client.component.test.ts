import type * as ReactStart from "@tanstack/react-start"
import { afterEach, expect, it, vi } from "vite-plus/test"

import { getStoredTheme } from "~/src/providers/theme-provider"

import { THEME } from "~/src/presentation/theme"

vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactStart>()),
  createIsomorphicFn: () => ({ server: (_server: unknown) => ({ client: <TFunction>(client: TFunction) => client }) }),
}))
afterEach(() => {
  document.cookie = "locale=; Max-Age=0; Path=/"
  document.cookie = `${THEME.COOKIE_NAME}=; Max-Age=0; Path=/`
})
it("reads the theme from the browser document cookie", () => {
  document.cookie = "locale=pl%2DPL; Path=/"
  document.cookie = `${THEME.COOKIE_NAME}=dark; Path=/`
  expect(getStoredTheme()).toBe("dark")
})
it("falls back to the default theme when the browser has no theme cookie", () => {
  expect(getStoredTheme()).toBe(THEME.DEFAULT_THEME)
})
