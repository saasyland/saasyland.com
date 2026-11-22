import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { generateBackupCodesMutation } from "~/src/modules/two-factor/use-cases/generate-backup-codes"

const CODES = { backupCodes: ["first-code", "second-code"], status: true as const }

afterEach(() => {
  vi.restoreAllMocks()
})

describe("generateBackupCodes", () => {
  it("replaces the backup codes after the password is confirmed", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture())
    const generate = vi.spyOn(auth.api, "generateBackupCodes").mockResolvedValue(CODES)

    await expect(executeMutation(generateBackupCodesMutation, { password: "SecretPass1!" })).resolves.toStrictEqual(CODES)
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ body: { password: "SecretPass1!" } }))
  })

  it("is for signed-in users only", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeMutation(generateBackupCodesMutation, { password: "SecretPass1!" })).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  })
})
