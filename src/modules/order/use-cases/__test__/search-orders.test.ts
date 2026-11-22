import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  ADMIN_ID,
  ORDERS,
  ORDER_USERS,
  PAID_CORE,
  PARTLY_REFUNDED_AGENCY,
  REFUNDED_GUEST,
} from "~/src/modules/order/__test__/fixtures/order-buyers"
import { order } from "~/src/modules/order/order.schema"
import { searchOrdersQuery } from "~/src/modules/order/use-cases/search-orders"
import { user } from "~/src/modules/user/user.schema"

import { ROUTES } from "~/src/routes"

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: ADMIN_ID }))
}

const idsFor = async (text: string): Promise<string[]> => {
  const hits = await executeQuery(searchOrdersQuery({ text }))
  return hits.map(({ id }) => id)
}

beforeEach(async () => {
  await db.delete(order)
  await db.delete(user)
  await db.insert(user).values(ORDER_USERS)
  await db.insert(order).values(ORDERS)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("search-orders", () => {
  it("finds an order by its ID and names its customer, newest first", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeQuery(searchOrdersQuery({ text: "ORD_PAID" }))).resolves.toStrictEqual([
      {
        detail: `${PAID_CORE.id} · ${PAID_CORE.description}`,
        id: PAID_CORE.id,
        title: "Ada Buyer",
        to: `${ROUTES.ADMIN_ORDERS}/${PAID_CORE.id}`,
      },
    ])
  })

  it("finds orders by the customer's name, email or Polar customer ID", async () => {
    signInAs(ROLE_CODES.ADMIN)

    expect(await idsFor("ada buyer")).toStrictEqual([PAID_CORE.id, PARTLY_REFUNDED_AGENCY.id])
    expect(await idsFor("grace@")).toHaveLength(1)
    expect(await idsFor("cus_guest")).toStrictEqual([REFUNDED_GUEST.id])
  })

  it("names an order without an account by its Polar customer", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const [hit] = await executeQuery(searchOrdersQuery({ text: "cus_guest" }))

    expect(hit?.title).toBe(REFUNDED_GUEST.customerId)
  })

  it("refuses a caller who may not read orders", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeQuery(searchOrdersQuery({ text: "ord" }))).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})
