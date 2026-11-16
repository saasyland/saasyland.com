import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { executeMutation } from "~/src/platform/testing/lib/query"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"

import { promoteToAdmin, signUpAndVerify } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { orderRow } from "~/src/modules/order/__test__/fixtures/order"
import { order } from "~/src/modules/order/order.schema"
import { deleteUserMutation } from "~/src/modules/user/use-cases/delete-user"
import { user } from "~/src/modules/user/user.schema"

const FOREIGN_KEY_VIOLATION = "FOREIGN KEY constraint failed"

const storedOrders = (id: string) => db.select().from(order).where(eq(order.id, id))

describe("order table in D1", () => {
  it("keeps an order, without its account, when an admin deletes the account", async () => {
    const admin = await signUpAndVerify()
    await promoteToAdmin(admin.userId)
    const buyer = await signUpAndVerify()
    const row = orderRow({ userId: buyer.userId })
    const [placed] = await db.insert(order).values(row).returning()
    vi.mocked(getRequest).mockReturnValue(new Request(TEST_APP_URL, { headers: admin.headers }))

    await expect(executeMutation(deleteUserMutation, { userId: buyer.userId })).resolves.toStrictEqual({ success: true })

    await expect(db.select().from(user).where(eq(user.id, buyer.userId))).resolves.toStrictEqual([])
    await expect(storedOrders(row.id)).resolves.toStrictEqual([{ ...placed, userId: JSON_NULL }])
  })

  it("stores an order of a customer who has no account", async () => {
    const row = orderRow()

    await db.insert(order).values(row)

    await expect(storedOrders(row.id)).resolves.toMatchObject([{ id: row.id, userId: JSON_NULL }])
  })

  it("refuses an order linked to an account that does not exist", async () => {
    const row = orderRow({ userId: crypto.randomUUID() })

    await expect(db.insert(order).values(row)).rejects.toHaveProperty("cause.message", expect.stringContaining(FOREIGN_KEY_VIOLATION))
    await expect(storedOrders(row.id)).resolves.toStrictEqual([])
  })
})
