import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { refundEligibility } from "~/src/modules/license/license.refunds"
import { license } from "~/src/modules/license/license.schema"
import { WITHDRAWAL_QUERY_KEYS } from "~/src/modules/withdrawal/withdrawal.constants"
import { accountContract } from "~/src/modules/withdrawal/withdrawal.contracts"
import { withdrawal } from "~/src/modules/withdrawal/withdrawal.schema"

const SINGLE_ROW = 1

const latestWithdrawal = async (userId: string) => {
  const [latest] = await db
    .select({ createdAt: withdrawal.createdAt })
    .from(withdrawal)
    .innerJoin(license, and(eq(license.id, withdrawal.licenseId), eq(license.polarOrderId, withdrawal.polarOrderId)))
    .where(eq(license.userId, userId))
    .orderBy(desc(withdrawal.createdAt))
    .limit(SINGLE_ROW)

  return latest
}

export const getWithdrawalContract = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }) => {
    const { user } = context.auth
    const [contract, latest] = await Promise.all([accountContract(user.id), latestWithdrawal(user.id)])

    if (contract === undefined) {
      return { contract }
    }

    return {
      contract: {
        eligibility: refundEligibility({ ...contract, now: new Date() }),
        email: user.email,
        name: user.name,
        purchasedAt: contract.purchaseCreatedAt,
        receivedAt: latest?.createdAt,
        reference: contract.reference,
        tier: contract.tier,
      },
    }
  })

export const withdrawalContractQuery = queryOptions({
  queryFn: () => getWithdrawalContract(),
  queryKey: WITHDRAWAL_QUERY_KEYS.CONTRACT,
})
