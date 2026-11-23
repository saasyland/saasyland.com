import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH } from "~/src/integrations/better-auth/auth.constraints"

import { REFUND_ELIGIBILITY } from "~/src/modules/license/license.constants"

export const WITHDRAWAL_CHANNEL = {
  ACCOUNT: "account",
  PUBLIC: "public",
} as const

export const WITHDRAWAL_CHANNELS = [WITHDRAWAL_CHANNEL.ACCOUNT, WITHDRAWAL_CHANNEL.PUBLIC] as const

export type WithdrawalChannel = (typeof WITHDRAWAL_CHANNELS)[number]

export const WITHDRAWAL_ELIGIBILITY = {
  ...REFUND_ELIGIBILITY,
  UNMATCHED: "unmatched",
} as const

export const WITHDRAWAL_ELIGIBILITIES = [
  WITHDRAWAL_ELIGIBILITY.STATUTORY_WITHDRAWAL,
  WITHDRAWAL_ELIGIBILITY.REFUNDABLE,
  WITHDRAWAL_ELIGIBILITY.USED,
  WITHDRAWAL_ELIGIBILITY.EXPIRED,
  WITHDRAWAL_ELIGIBILITY.UNMATCHED,
] as const

export type WithdrawalEligibility = (typeof WITHDRAWAL_ELIGIBILITIES)[number]

export const WITHDRAWAL_REFERENCE_MAX_LENGTH = 128

export const WITHDRAWAL_VALIDATION_PARAMS: Record<string, Record<string, number>> = {
  emailMaxLength: { max: EMAIL_MAX_LENGTH },
  nameMaxLength: { max: NAME_MAX_LENGTH },
  referenceMaxLength: { max: WITHDRAWAL_REFERENCE_MAX_LENGTH },
}

export const WITHDRAWAL_QUERY_KEYS = {
  ALL: ["withdrawal"],
  CONTRACT: ["withdrawal", "getWithdrawalContract"],
  USER: ["withdrawal", "getUserWithdrawals"],
} as const

export const WITHDRAWAL_MUTATION_KEYS = {
  SUBMIT: ["withdrawal", "submitWithdrawal"],
} as const

export const WITHDRAWAL_EMAIL_PURPOSE = {
  WITHDRAWAL_ACKNOWLEDGEMENT: "withdrawal-acknowledgement",
  WITHDRAWAL_NOTIFICATION: "withdrawal-notification",
} as const
