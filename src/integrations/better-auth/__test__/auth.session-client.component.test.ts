import type * as ReactStart from "@tanstack/react-start"
import { afterEach, expect, it, vi } from "vite-plus/test"

import { hasSessionCookie } from "~/src/integrations/better-auth/auth.session"

import { APP_SLUG } from "~/src/presentation/branding"

const SESSION_COOKIE = `${APP_SLUG}.session_token`

vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactStart>()),
  createIsomorphicFn: () => ({ server: (_server: unknown) => ({ client: <TFunction>(client: TFunction) => client }) }),
}))
afterEach(() => {
  document.cookie = `${SESSION_COOKIE}=; Max-Age=0; Path=/`
})
it("leaves the session cookie to the server in the browser, which never sees the real one", () => {
  document.cookie = `${SESSION_COOKIE}=readable; Path=/`
  expect(hasSessionCookie()).toBe(false)
})
