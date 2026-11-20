import type * as StartServerModule from "@tanstack/react-start/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import type { auth } from "~/src/integrations/better-auth/auth.server"
import * as authServer from "~/src/integrations/better-auth/auth.server"

import { requestPasswordResetMutation } from "~/src/modules/verification/use-cases/request-password-reset"

import * as rateLimits from "~/src/lib/rate-limit"

const HEADERS = new Headers()

type AuthApi = typeof auth.api

const requestPasswordResetMock = vi.hoisted(() => vi.fn<AuthApi["requestPasswordReset"]>())

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: HEADERS })),
}))

describe("request-password-reset", () => {
  it("calls auth.api.requestPasswordReset", async () => {
    expect.hasAssertions()
    requestPasswordResetMock.mockReset()
    vi.spyOn(authServer.auth.api, "requestPasswordReset").mockImplementation(requestPasswordResetMock)
    const resetRequestResult = { message: "ok", status: true }
    requestPasswordResetMock.mockResolvedValue(resetRequestResult)

    await expect(
      executeMutation(requestPasswordResetMutation, {
        email: "user@example.com",
        redirectTo: "https://example.com/reset-password",
      }),
    ).resolves.toStrictEqual({ sent: true })

    expect(requestPasswordResetMock).toHaveBeenCalledWith({
      body: {
        email: "user@example.com",
        redirectTo: "https://example.com/reset-password",
      },
      headers: HEADERS,
    })
  })

  it("sends nothing, and says when to try again, once the address has had its emails for the hour", async () => {
    vi.spyOn(rateLimits, "recipientAllowance").mockResolvedValue({ allowed: false, retryAfter: 900 })
    const request = vi.spyOn(authServer.auth.api, "requestPasswordReset")

    await expect(
      executeMutation(requestPasswordResetMutation, { email: "user@example.com", redirectTo: "https://example.com/reset-password" }),
    ).resolves.toStrictEqual({ retryAfterSeconds: 900, sent: false })
    expect(request).not.toHaveBeenCalled()
  })
})
