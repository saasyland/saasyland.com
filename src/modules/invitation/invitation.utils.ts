import { type SQL, and, eq, gt, isNull } from "drizzle-orm"

import {
  INVITATION_LIFETIME_DAYS,
  INVITATION_STATUS,
  INVITATION_TOKEN_LENGTH,
  type InvitationStatus,
} from "~/src/modules/invitation/invitation.constants"
import { invitation } from "~/src/modules/invitation/invitation.schema"
import type { Invitation } from "~/src/modules/invitation/invitation.types"

import { MILLISECONDS_PER_DAY } from "~/src/lib/duration"
import { randomHex, sha256Hex } from "~/src/lib/hex"

export const invitationStatus = (
  { acceptedAt, expiresAt, revokedAt }: Pick<Invitation["select"], "acceptedAt" | "expiresAt" | "revokedAt">,
  now: Date,
): InvitationStatus => {
  if (acceptedAt !== null) {
    return INVITATION_STATUS.ACCEPTED
  }
  if (revokedAt !== null) {
    return INVITATION_STATUS.REVOKED
  }
  if (expiresAt <= now) {
    return INVITATION_STATUS.EXPIRED
  }
  return INVITATION_STATUS.PENDING
}

export const invitationExpiry = (sentAt: Date): Date => new Date(sentAt.getTime() + INVITATION_LIFETIME_DAYS * MILLISECONDS_PER_DAY)

export const issueInvitationToken = async (): Promise<{ readonly token: string; readonly tokenHash: string }> => {
  const token = randomHex(INVITATION_TOKEN_LENGTH)

  return { token, tokenHash: await sha256Hex(token) }
}

export const openInvitation = (tokenHash: string, now: Date): SQL | undefined =>
  and(eq(invitation.tokenHash, tokenHash), isNull(invitation.acceptedAt), isNull(invitation.revokedAt), gt(invitation.expiresAt, now))
