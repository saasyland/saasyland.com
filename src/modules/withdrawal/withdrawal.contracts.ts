import "@tanstack/react-start/server-only"

import { type SQL, type SQLWrapper, and, eq, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_STATUS, type LicenseTier } from "~/src/modules/license/license.constants"
import { refundEligibility } from "~/src/modules/license/license.refunds"
import { license } from "~/src/modules/license/license.schema"
import { order } from "~/src/modules/order/order.schema"
import { user } from "~/src/modules/user/user.schema"
import type { WithdrawalEligibility } from "~/src/modules/withdrawal/withdrawal.constants"

const activeContracts = (match: SQL | undefined) =>
  db
    .select({
      deliveredAt: license.deliveredAt,
      email: user.email,
      lessonOpenedAt: license.lessonOpenedAt,
      licenseId: license.id,
      polarOrderId: license.polarOrderId,
      purchaseCreatedAt: license.purchaseCreatedAt,
      reference: sql<string>`coalesce(${order.invoiceNumber}, ${license.polarOrderId}, ${license.id})`,
      tier: license.tier,
      userId: user.id,
      withdrawalConsentAt: license.withdrawalConsentAt,
    })
    .from(license)
    .innerJoin(user, eq(user.id, license.userId))
    .leftJoin(order, eq(order.id, license.polarOrderId))
    .where(and(eq(license.status, LICENSE_STATUS.ACTIVE), match))
    .limit(1)

type ActiveContract = Awaited<ReturnType<typeof activeContracts>>[number]

export const accountContract = async (userId: string): Promise<ActiveContract | undefined> => {
  const [contract] = await activeContracts(eq(license.userId, userId))

  return contract
}

interface ContractClaim {
  readonly email: string
  readonly reference: string
  readonly userId: string | undefined
}

export interface MatchedContract {
  readonly eligibility: WithdrawalEligibility
  readonly licenseId: string
  readonly polarOrderId: string | null
  readonly tier: LicenseTier
  readonly userId: string
}

const sameText = (column: SQLWrapper, value: string): SQL => sql`lower(${column}) = ${value.toLowerCase()}`

const isClaimedBy = ({ email, userId }: ContractClaim, contract: ActiveContract): boolean =>
  contract.userId === userId || contract.email.toLowerCase() === email.toLowerCase()

export const matchContract = async (claim: ContractClaim, now: Date): Promise<MatchedContract | undefined> => {
  const contracts = await activeContracts(
    or(sameText(license.polarOrderId, claim.reference), sameText(order.invoiceNumber, claim.reference)),
  )
  const contract = contracts.find((candidate) => isClaimedBy(claim, candidate))

  return (
    contract && {
      eligibility: refundEligibility({ ...contract, now }).kind,
      licenseId: contract.licenseId,
      polarOrderId: contract.polarOrderId,
      tier: contract.tier,
      userId: contract.userId,
    }
  )
}
