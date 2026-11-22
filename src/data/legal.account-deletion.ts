import type { AccountDeletionNotice } from "~/src/data/account-deletion"

import { AccountDeletionRecords } from "~/src/presentation/components/custom/account-deletion-records"

export const LEGAL_ACCOUNT_DELETION = [
  { Notice: AccountDeletionRecords, key: "records", load: () => Promise.resolve() },
] as const satisfies readonly AccountDeletionNotice[]
