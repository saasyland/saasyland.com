import type * as StartServerModule from "@tanstack/react-start/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import type { auth } from "~/src/integrations/better-auth/auth.server"
import * as authServer from "~/src/integrations/better-auth/auth.server"

import { sendVerificationEmailMutation } from "~/src/modules/verification/use-cases/send-verification-email"

import * as rateLimits from "~/src/lib/rate-limit"

const HEADERS = new Headers()

type AuthApi = typeof auth.api

const sendVerificationEmailMock = vi.hoisted(() => vi.fn<AuthApi["sendVerificationEmail"]>())

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: HEADERS })),
}))

describe("send-verification-email", () => {
  it("calls auth.api.sendVerificationEmail", async () => {
    expect.hasAssertions()
    sendVerificationEmailMock.mockReset()
    sendVerificationEmailMock.mockResolvedValue({ status: true })
    vi.spyOn(authServer.auth.api, "sendVerificationEmail").mockImplementation(sendVerificationEmailMock)

    await expect(
      executeMutation(sendVerificationEmailMutation, { callbackURL: "https://example.com/en/app", email: "ada@example.com" }),
    ).resolves.toStrictEqual({ sent: true })
    expect(sendVerificationEmailMock).toHaveBeenCalledWith({
      body: { callbackURL: "https://example.com/en/app", email: "ada@example.com" },
      headers: HEADERS,
    })
  })

  it("sends nothing, and says when to try again, once the address has had its emails for the hour", async () => {
    vi.spyOn(rateLimits, "recipientAllowance").mockResolvedValue({ allowed: false, retryAfter: 1200 })
    const send = vi.spyOn(authServer.auth.api, "sendVerificationEmail")

    await expect(
      executeMutation(sendVerificationEmailMutation, { callbackURL: "https://example.com/en/app", email: "ada@example.com" }),
    ).resolves.toStrictEqual({ retryAfterSeconds: 1200, sent: false })
    expect(send).not.toHaveBeenCalled()
  })
})
