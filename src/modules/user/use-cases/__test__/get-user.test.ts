import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getUserQuery } from "~/src/modules/user/use-cases/get-user"
import { user } from "~/src/modules/user/user.schema"

const ADMIN_USER_ID = "01900000-0000-7000-8000-000000000001"
const TARGET_USER_ID = "01900000-0000-7000-8000-000000000002"
const MISSING_USER_ID = "01900000-0000-7000-8000-000000000009"

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values([
    { email: "admin@example.test", id: ADMIN_USER_ID, name: "Admin", role: ROLE_CODES.ADMIN },
    { email: "grace@example.test", id: TARGET_USER_ID, name: "Grace Hopper", role: ROLE_CODES.CUSTOMER },
  ])
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_USER_ID }))
})
afterEach(() => vi.restoreAllMocks())

describe("get-user", () => {
  it("reads one user's row for an administrator", async () => {
    await expect(executeQuery(getUserQuery({ userId: TARGET_USER_ID }))).resolves.toMatchObject({
      email: "grace@example.test",
      id: TARGET_USER_ID,
      name: "Grace Hopper",
      role: ROLE_CODES.CUSTOMER,
    })
  })

  it("caches each user under their own key", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })

    await queryClient.query(getUserQuery({ userId: TARGET_USER_ID }))
    await queryClient.query(getUserQuery({ userId: ADMIN_USER_ID }))

    expect(queryClient.getQueryData(getUserQuery({ userId: TARGET_USER_ID }).queryKey)).toMatchObject({ name: "Grace Hopper" })
    expect(queryClient.getQueryData(getUserQuery({ userId: ADMIN_USER_ID }).queryKey)).toMatchObject({ name: "Admin" })
  })

  it("reports a user who does not exist as not found", async () => {
    await expect(executeQuery(getUserQuery({ userId: MISSING_USER_ID }))).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
  })

  it("rejects a caller without the permission to read users", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: TARGET_USER_ID }))

    await expect(executeQuery(getUserQuery({ userId: TARGET_USER_ID }))).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects a signed-out caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(executeQuery(getUserQuery({ userId: TARGET_USER_ID }))).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
