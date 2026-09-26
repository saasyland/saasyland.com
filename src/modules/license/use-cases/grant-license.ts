import "@tanstack/react-start/server-only"

import { and, eq, sql } from "drizzle-orm"
import { v7 } from "uuid"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { type LicenseTier, license, revokedLicenseOrder } from "~/src/modules/license/license.schema"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

const backfillPurchaseDate = async (userId: string): Promise<void> => {
  const current = await getLicense(userId)
  if (current?.purchaseCreatedAt.getTime() !== 0 || current.polarOrderId === null) {
    return
  }
  const order = await polar.orders.get({ id: current.polarOrderId })
  await db
    .update(license)
    .set({ purchaseCreatedAt: order.createdAt })
    .where(
      and(
        eq(license.userId, userId),
        eq(license.polarOrderId, current.polarOrderId),
        eq(license.purchaseCreatedAt, current.purchaseCreatedAt),
      ),
    )
}

interface GrantLicenseInput {
  readonly polarCustomerId: string
  readonly polarOrderId: string
  readonly purchaseCreatedAt: Date
  readonly tier: LicenseTier
  readonly userId: string
}

export const grantLicense = async ({
  polarCustomerId,
  polarOrderId,
  purchaseCreatedAt,
  tier,
  userId,
}: Readonly<GrantLicenseInput>): Promise<void> => {
  await backfillPurchaseDate(userId)
  await db.run(sql`
    insert into ${license} (id, polar_customer_id, polar_order_id, purchase_created_at, tier, user_id)
    select ${v7()}, ${polarCustomerId}, ${polarOrderId}, ${purchaseCreatedAt.getTime()}, ${tier}, ${userId}
    where not exists (select 1 from ${revokedLicenseOrder} where polar_order_id = ${polarOrderId})
    on conflict(user_id) do update set
      polar_customer_id = excluded.polar_customer_id,
      polar_order_id = excluded.polar_order_id,
      purchase_created_at = excluded.purchase_created_at,
      tier = excluded.tier,
      status = ${LICENSE_STATUS.ACTIVE},
      key = null,
      polar_license_key_id = null,
      updated_at = ${Date.now()}
    where (license.polar_order_id is null or license.polar_order_id <> excluded.polar_order_id)
      and license.purchase_created_at < excluded.purchase_created_at
  `)
}
