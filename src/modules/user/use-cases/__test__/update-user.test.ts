import type * as StartServerModule from "@tanstack/react-start/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createAuthUserMutationResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import type { auth } from "~/src/integrations/better-auth/auth.server"
import * as authServer from "~/src/integrations/better-auth/auth.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { updateUserMutation } from "~/src/modules/user/use-cases/update-user"

const HEADERS = new Headers()
const TARGET_USER_ID = "01900000-0000-7000-8000-000000000002"
const ADMIN_USER_ID = "01900000-0000-7000-8000-000000000001"

type AuthApi = typeof auth.api

const getSessionMock = vi.hoisted(() => vi.fn<AuthApi["getSession"]>())
const adminUpdateUserMock = vi.hoisted(() => vi.fn<AuthApi["adminUpdateUser"]>())

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: HEADERS })),
}))

const mockAdminSession = (): void => {
  getSessionMock.mockReset()
  adminUpdateUserMock.mockReset()
  vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
  vi.spyOn(authServer.auth.api, "adminUpdateUser").mockImplementation(adminUpdateUserMock)
  getSessionMock.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_USER_ID }))
}

describe("update-user", () => {
  it("renames the user through auth.api.adminUpdateUser", async () => {
    expect.hasAssertions()
    mockAdminSession()
    const updatedUser = createAuthUserMutationResult({ userId: TARGET_USER_ID }).user
    adminUpdateUserMock.mockResolvedValue(updatedUser)

    await expect(executeMutation(updateUserMutation, { name: "Updated Name", userId: TARGET_USER_ID })).resolves.toMatchObject(updatedUser)

    expect(adminUpdateUserMock).toHaveBeenCalledExactlyOnceWith({
      body: { data: { name: "Updated Name" }, userId: TARGET_USER_ID },
      headers: HEADERS,
    })
  })

  it("rejects an empty name before calling Better Auth", async () => {
    expect.hasAssertions()
    mockAdminSession()

    await expect(executeMutation(updateUserMutation, { name: "", userId: TARGET_USER_ID })).rejects.toThrow(ERROR_CODES.VALIDATION)

    expect(adminUpdateUserMock).not.toHaveBeenCalled()
  })

  it("returns a domain error when the caller is not an admin", async () => {
    expect.hasAssertions()
    getSessionMock.mockReset()
    adminUpdateUserMock.mockReset()
    vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
    vi.spyOn(authServer.auth.api, "adminUpdateUser").mockImplementation(adminUpdateUserMock)
    getSessionMock.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: ADMIN_USER_ID }))

    await expect(executeMutation(updateUserMutation, { name: "Updated Name", userId: TARGET_USER_ID })).rejects.toThrow(
      ERROR_CODES.FORBIDDEN,
    )

    expect(adminUpdateUserMock).not.toHaveBeenCalled()
  })
})
