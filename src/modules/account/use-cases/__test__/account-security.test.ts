import type * as StartServerModule from "@tanstack/react-start/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation, executeQuery } from "~/src/platform/testing/lib/query"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { changePasswordMutation } from "~/src/modules/account/use-cases/change-password"
import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import { setPasswordMutation } from "~/src/modules/account/use-cases/set-password"
import { unlinkAccountMutation } from "~/src/modules/account/use-cases/unlink-account"

const ORIGIN = "http://127.0.0.1:3000"
const NEW_PASSWORD = "SecretPass1!longer"
const CREATED_AT = new Date("2026-11-01T00:00:00Z")
const ACCOUNT_ID = "01900000-0000-7000-8000-0000000000a1"

const request = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request(`${ORIGIN}/app/settings`, { headers: request.headers })),
}))

const linkedAccount = (providerId: string) => ({
  accountId: `${providerId}-account`,
  createdAt: CREATED_AT,
  id: `${providerId}-row`,
  providerId,
  scopes: [],
  updatedAt: CREATED_AT,
  userId: createAuthSessionFixture().user.id,
})

beforeEach(() => {
  request.headers = new Headers({ referer: `${ORIGIN}/pl-PL/app/settings?tab=security` })
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("changePassword", () => {
  it("always signs out the other devices of the account", async () => {
    const changePassword = vi
      .spyOn(auth.api, "changePassword")
      .mockResolvedValue({ token: "new-token", user: createAuthSessionFixture().user })

    await executeMutation(changePasswordMutation, { currentPassword: "OldSecret1!", newPassword: NEW_PASSWORD })

    expect(changePassword).toHaveBeenCalledWith(
      expect.objectContaining({ body: { currentPassword: "OldSecret1!", newPassword: NEW_PASSWORD, revokeOtherSessions: true } }),
    )
  })
})

describe("setPassword", () => {
  it("adds a password, signs out the other devices and tells the account in the page's language", async () => {
    const setPassword = vi.spyOn(auth.api, "setPassword").mockResolvedValue({ status: true })
    const revokeOthers = vi.spyOn(auth.api, "revokeOtherSessions").mockResolvedValue({ status: true })

    await expect(executeMutation(setPasswordMutation, { newPassword: NEW_PASSWORD })).resolves.toStrictEqual({ status: true })

    expect(setPassword).toHaveBeenCalledWith(expect.objectContaining({ body: { newPassword: NEW_PASSWORD } }))
    expect(revokeOthers).toHaveBeenCalledOnce()
    const [email] = getSentEmails(createAuthSessionFixture().user.email)
    expect(email?.idempotencyKey?.startsWith(`${EMAIL_PURPOSE.PASSWORD_CHANGED}/`)).toBe(true)
    expect(email?.html).toContain('lang="pl-PL"')
  })

  it("refuses a password that is too short before Better Auth sees it", async () => {
    const setPassword = vi.spyOn(auth.api, "setPassword")

    await expect(executeMutation(setPasswordMutation, { newPassword: "short" })).rejects.toThrow(ERROR_CODES.VALIDATION)
    expect(setPassword).not.toHaveBeenCalled()
  })
})

describe("listAccounts", () => {
  it("lists the caller's sign-in methods without their tokens", async () => {
    vi.spyOn(auth.api, "listUserAccounts").mockResolvedValue([linkedAccount(AUTH_PROVIDER.CREDENTIAL), linkedAccount(AUTH_PROVIDER.GITHUB)])

    await expect(executeQuery(listAccountsQuery)).resolves.toStrictEqual([
      { createdAt: CREATED_AT, id: `${AUTH_PROVIDER.CREDENTIAL}-row`, providerId: AUTH_PROVIDER.CREDENTIAL },
      { createdAt: CREATED_AT, id: `${AUTH_PROVIDER.GITHUB}-row`, providerId: AUTH_PROVIDER.GITHUB },
    ])
  })

  it("is for signed-in users only", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeQuery(listAccountsQuery)).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  })
})

describe("unlinkAccount", () => {
  it("disconnects one of the caller's accounts by its row ID", async () => {
    const unlink = vi.spyOn(auth.api, "unlinkAccount").mockResolvedValue({ status: true })

    await expect(executeMutation(unlinkAccountMutation, { accountId: ACCOUNT_ID })).resolves.toStrictEqual({ status: true })
    expect(unlink).toHaveBeenCalledWith(expect.objectContaining({ body: { accountId: ACCOUNT_ID } }))
  })

  it("is for signed-in users only", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeMutation(unlinkAccountMutation, { accountId: ACCOUNT_ID })).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  })
})
