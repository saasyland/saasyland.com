import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { executeMutation } from "~/src/platform/testing/lib/query"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"

import { promoteToAdmin, signUpAndVerify } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { subscriptionRow } from "~/src/modules/subscription/__test__/fixtures/subscription"
import { subscription } from "~/src/modules/subscription/subscription.schema"
import { deleteUserMutation } from "~/src/modules/user/use-cases/delete-user"
import { user } from "~/src/modules/user/user.schema"

const FOREIGN_KEY_VIOLATION = "FOREIGN KEY constraint failed"

const storedSubscriptions = (id: string) => db.select().from(subscription).where(eq(subscription.id, id))

describe("subscription table in D1", () => {
  it("keeps a subscription, without its account, when an admin deletes the account", async () => {
    const admin = await signUpAndVerify()
    await promoteToAdmin(admin.userId)
    const subscriber = await signUpAndVerify()
    const row = subscriptionRow({ userId: subscriber.userId })
    const [started] = await db.insert(subscription).values(row).returning()
    vi.mocked(getRequest).mockReturnValue(new Request(TEST_APP_URL, { headers: admin.headers }))

    await expect(executeMutation(deleteUserMutation, { userId: subscriber.userId })).resolves.toStrictEqual({ success: true })

    await expect(db.select().from(user).where(eq(user.id, subscriber.userId))).resolves.toStrictEqual([])
    await expect(storedSubscriptions(row.id)).resolves.toStrictEqual([{ ...started, userId: JSON_NULL }])
  })

  it("stores a subscription of a customer who has no account", async () => {
    const row = subscriptionRow()

    await db.insert(subscription).values(row)

    await expect(storedSubscriptions(row.id)).resolves.toMatchObject([{ id: row.id, userId: JSON_NULL }])
  })

  it("refuses a subscription linked to an account that does not exist", async () => {
    const row = subscriptionRow({ userId: crypto.randomUUID() })

    await expect(db.insert(subscription).values(row)).rejects.toHaveProperty(
      "cause.message",
      expect.stringContaining(FOREIGN_KEY_VIOLATION),
    )
    await expect(storedSubscriptions(row.id)).resolves.toStrictEqual([])
  })
})
