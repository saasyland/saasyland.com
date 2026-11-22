import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { confirmAccountDeletionMutation } from "~/src/modules/user/use-cases/confirm-account-deletion"
import { requestAccountDeletionMutation } from "~/src/modules/user/use-cases/request-account-deletion"

import { ROUTES } from "~/src/routes"

const SENT = { message: "Verification email sent", success: true }
const DELETED = { message: "User deleted", success: true }

beforeEach(() => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("requestAccountDeletion", () => {
  it.each([{ callbackURL: ROUTES.APP_DELETE_ACCOUNT, password: "SecretPass1!" }, { callbackURL: `/pl-PL${ROUTES.APP_DELETE_ACCOUNT}` }])(
    "asks Better Auth to email the confirmation link for $callbackURL",
    async (input) => {
      const deleteUser = vi.spyOn(auth.api, "deleteUser").mockResolvedValue(SENT)

      await expect(executeMutation(requestAccountDeletionMutation, input)).resolves.toStrictEqual(SENT)
      expect(deleteUser).toHaveBeenCalledWith(expect.objectContaining({ body: input }))
    },
  )

  it("refuses a callback that leaves the site", async () => {
    const deleteUser = vi.spyOn(auth.api, "deleteUser")

    await expect(executeMutation(requestAccountDeletionMutation, { callbackURL: "https://example.test/app" })).rejects.toThrow(
      ERROR_CODES.VALIDATION,
    )
    expect(deleteUser).not.toHaveBeenCalled()
  })
})

describe("confirmAccountDeletion", () => {
  it("deletes the signed-in account with the emailed token", async () => {
    const deleteUser = vi.spyOn(auth.api, "deleteUser").mockResolvedValue(DELETED)

    await expect(executeMutation(confirmAccountDeletionMutation, { token: "emailed-token" })).resolves.toStrictEqual(DELETED)
    expect(deleteUser).toHaveBeenCalledWith(expect.objectContaining({ body: { token: "emailed-token" } }))
  })

  it("is for signed-in users only", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeMutation(confirmAccountDeletionMutation, { token: "emailed-token" })).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  })
})
