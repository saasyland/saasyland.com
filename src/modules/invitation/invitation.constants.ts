import { SECONDS_PER_HOUR } from "~/src/lib/duration"

export const INVITATION_LIFETIME_DAYS = 7

export const INVITATION_TOKEN_LENGTH = 64

export const INVITATION_RATE_LIMIT = { max: 20, window: SECONDS_PER_HOUR } as const

export const INVITATION_STATUS = {
  ACCEPTED: "accepted",
  EXPIRED: "expired",
  PENDING: "pending",
  REVOKED: "revoked",
} as const

export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS]

export const INVITATION_QUERY_KEYS = {
  ALL: ["invitation"],
  DETAIL: ["invitation", "getInvitation"],
  LIST: ["invitation", "listInvitations"],
} as const

export const INVITATION_MUTATION_KEYS = {
  ACCEPT: ["invitation", "acceptInvitation"],
  CLAIM: ["invitation", "claimInvitation"],
  CREATE: ["invitation", "createInvitation"],
  RESEND: ["invitation", "resendInvitation"],
  REVOKE: ["invitation", "revokeInvitation"],
} as const
