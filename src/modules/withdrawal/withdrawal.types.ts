import type * as zod from "zod"

import type { getUserWithdrawals } from "~/src/modules/withdrawal/use-cases/get-user-withdrawals"
import type { getWithdrawalContract } from "~/src/modules/withdrawal/use-cases/get-withdrawal-contract"
import type { submitWithdrawal } from "~/src/modules/withdrawal/use-cases/submit-withdrawal"
import type { withdrawal } from "~/src/modules/withdrawal/withdrawal.schema"
import type { withdrawalZodSchemas } from "~/src/modules/withdrawal/withdrawal.zod"

export interface Withdrawal {
  select: typeof withdrawal.$inferSelect
  insert: typeof withdrawal.$inferInsert
  contract: NonNullable<Awaited<ReturnType<typeof getWithdrawalContract>>["contract"]>
  receipt: Awaited<ReturnType<typeof submitWithdrawal>>
  userRow: Awaited<ReturnType<typeof getUserWithdrawals>>["rows"][number]
  getUserWithdrawals: zod.input<typeof withdrawalZodSchemas.getUserWithdrawals>
  submitWithdrawal: zod.input<typeof withdrawalZodSchemas.submitWithdrawal>
}
