import { beforeEach, expect, it } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import { revokeLicense } from "~/src/modules/license/use-cases/revoke-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "revoke-owner"
beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values({ email: "revoke@example.test", id: USER_ID, name: "Buyer" })
})

it("revokes only the matching order and leaves a durable record on duplicate delivery", async () => {
  await grantLicense({ polarCustomerId: "cus_1", polarOrderId: "ord_1", purchaseCreatedAt: new Date(), tier: "core", userId: USER_ID })
  await revokeLicense({ polarOrderId: "unrelated", userId: USER_ID })
  expect(await getLicense(USER_ID)).toMatchObject({ status: "active" })
  await revokeLicense({ polarOrderId: "ord_1", userId: USER_ID })
  await revokeLicense({ polarOrderId: "ord_1", userId: USER_ID })
  expect(await getLicense(USER_ID)).toMatchObject({ polarOrderId: "ord_1", status: "revoked" })
})
