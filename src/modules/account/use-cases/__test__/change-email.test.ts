import type * as StartServerModule from "@tanstack/react-start/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import type { auth } from "~/src/integrations/better-auth/auth.server"
import * as authServer from "~/src/integrations/better-auth/auth.server"

import { changeEmailMutation } from "~/src/modules/account/use-cases/change-email"

const HEADERS = new Headers()
const USER_ID = "01900000-0000-7000-8000-000000000001"
const CHANGE_EMAIL = { callbackURL: "/pl-PL/app", newEmail: "ada@example.com" }

type AuthApi = typeof auth.api

const getSessionMock = vi.hoisted(() => vi.fn<AuthApi["getSession"]>())
const changeEmailMock = vi.hoisted(() => vi.fn<AuthApi["changeEmail"]>())

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: HEADERS })),
}))

describe("change-email", () => {
  it("changes the signed-in admin email and returns them to the page they started on", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    changeEmailMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    vi.spyOn(authServer.auth.api, "changeEmail").mockImplementation(changeEmailMock)
    getSessionMock.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: USER_ID }))
    changeEmailMock.mockResolvedValue({ status: true })

    await expect(executeMutation(changeEmailMutation, CHANGE_EMAIL)).resolves.toMatchObject({ status: true })
    expect(changeEmailMock).toHaveBeenCalledWith({ body: CHANGE_EMAIL, headers: HEADERS })
  })

  it("returns a domain error when the caller is signed out", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    getSessionMock.mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeMutation(changeEmailMutation, CHANGE_EMAIL)).rejects.toThrow("UNAUTHORIZED")
  })
})
