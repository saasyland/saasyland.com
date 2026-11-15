import { beforeEach, expect, it } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import { revokeLicense } from "~/src/modules/license/use-cases/revoke-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "revoke-owner"
const ORDER_ID = "ord_1"

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values({ email: "revoke@example.test", id: USER_ID, name: "Buyer" })
  await grantLicense({
    polarCustomerId: "cus_1",
    polarOrderId: ORDER_ID,
    purchaseCreatedAt: new Date(),
    tier: LICENSE_TIER.CORE,
    userId: USER_ID,
  })
})

it("revokes only the matching order and leaves a durable record on duplicate delivery", async () => {
  await revokeLicense({ polarOrderId: "unrelated", status: LICENSE_STATUS.REVOKED, userId: USER_ID })
  expect(await getLicense(USER_ID)).toMatchObject({ status: LICENSE_STATUS.ACTIVE })
  await revokeLicense({ polarOrderId: ORDER_ID, status: LICENSE_STATUS.REVOKED, userId: USER_ID })
  await revokeLicense({ polarOrderId: ORDER_ID, status: LICENSE_STATUS.REVOKED, userId: USER_ID })
  expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: ORDER_ID, status: LICENSE_STATUS.REVOKED })
})

it.each([
  ["before", [LICENSE_STATUS.REFUNDED, LICENSE_STATUS.REVOKED]],
  ["after", [LICENSE_STATUS.REVOKED, LICENSE_STATUS.REFUNDED]],
] as const)("keeps a refund when Polar revokes the benefit %s refunding the order", async (_order, statuses) => {
  for (const status of statuses) {
    await revokeLicense({ polarOrderId: ORDER_ID, status, userId: USER_ID })
  }

  expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: ORDER_ID, status: LICENSE_STATUS.REFUNDED })
})
