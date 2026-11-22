import "@tanstack/react-start/server-only"

import { eq } from "drizzle-orm"
import { v7 } from "uuid"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { sendWithdrawalAcknowledgement } from "~/src/modules/withdrawal/use-cases/send-withdrawal-acknowledgement"
import { type WithdrawalNotification, sendWithdrawalNotification } from "~/src/modules/withdrawal/use-cases/send-withdrawal-notification"
import { WITHDRAWAL_ELIGIBILITY, type WithdrawalChannel } from "~/src/modules/withdrawal/withdrawal.constants"
import type { MatchedContract } from "~/src/modules/withdrawal/withdrawal.contracts"
import { withdrawal } from "~/src/modules/withdrawal/withdrawal.schema"
import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"

import { withinRecipientRateLimit } from "~/src/lib/rate-limit"

interface WithdrawalStatement {
  readonly channel: WithdrawalChannel
  readonly contract: MatchedContract | undefined
  readonly email: string
  readonly locale: SupportedLocale
  readonly name: string
  readonly origin: string
  readonly reference: string
  readonly userId: string | undefined
}

interface WithdrawalReceipt {
  readonly acknowledged: boolean
  readonly email: string
  readonly name: string
  readonly reference: string
  readonly submittedAt: Date
}

const acknowledge = async (statement: Withdrawal["select"]): Promise<Withdrawal["select"]> => {
  if (!(await withinRecipientRateLimit({ kind: EMAIL_PURPOSE.WITHDRAWAL_ACKNOWLEDGEMENT, recipient: statement.email }))) {
    console.warn("[withdrawal] acknowledgement not sent: the recipient reached the hourly limit")
    return statement
  }

  try {
    await sendWithdrawalAcknowledgement(statement)
  } catch (error) {
    console.error("[withdrawal] acknowledgement not sent", error)
    return statement
  }

  const acknowledgedAt = new Date()
  await db.update(withdrawal).set({ acknowledgedAt }).where(eq(withdrawal.id, statement.id))

  return { ...statement, acknowledgedAt }
}

const notifyOwner = async (notification: WithdrawalNotification): Promise<void> => {
  try {
    await sendWithdrawalNotification(notification)
  } catch (error) {
    console.error("[withdrawal] owner notification not sent", error)
  }
}

export const recordWithdrawal = async ({
  contract,
  origin,
  userId,
  ...statement
}: Readonly<WithdrawalStatement>): Promise<WithdrawalReceipt> => {
  const row = await db
    .insert(withdrawal)
    .values({
      ...statement,
      eligibility: contract?.eligibility ?? WITHDRAWAL_ELIGIBILITY.UNMATCHED,
      id: v7(),
      licenseId: contract?.licenseId,
      polarOrderId: contract?.polarOrderId,
      userId: contract?.userId ?? userId,
    })
    .returning()
    .get()
  const acknowledged = await acknowledge(row)
  await notifyOwner({ origin, statement: acknowledged, tier: contract?.tier })

  return {
    acknowledged: acknowledged.acknowledgedAt !== null,
    email: row.email,
    name: row.name,
    reference: row.reference,
    submittedAt: row.createdAt,
  }
}
