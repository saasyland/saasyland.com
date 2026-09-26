import type * as ReactStart from "@tanstack/react-start"
import { afterEach, expect, it, vi } from "vite-plus/test"

import { getCookie } from "~/src/lib/cookie"

vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactStart>()),
  createIsomorphicFn: () => ({ server: (_server: unknown) => ({ client: <TFunction>(client: TFunction) => client }) }),
}))
afterEach(() => {
  document.cookie = "locale=; Max-Age=0; Path=/"
  document.cookie = "theme=; Max-Age=0; Path=/"
})
it("reads and decodes a cookie from the browser document", () => {
  document.cookie = "locale=pl%2DPL; Path=/"
  document.cookie = "theme=dark; Path=/"
  expect(getCookie("locale")).toBe("pl-PL")
})
it("returns undefined for a cookie the browser does not have", () => {
  expect(getCookie("locale")).toBeUndefined()
})
