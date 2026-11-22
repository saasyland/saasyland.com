import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

import { INVITATION_STATUS, INVITATION_TOKEN_LENGTH } from "~/src/modules/invitation/invitation.constants"
import { invitation } from "~/src/modules/invitation/invitation.schema"
import { invitationStatus } from "~/src/modules/invitation/invitation.utils"
import { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"
import { user } from "~/src/modules/user/user.schema"

const NOW = new Date("2026-11-22T12:00:00Z")
const LATER = new Date("2026-11-29T12:00:00Z")
const ADDRESS = "ada@example.test"

describe("invitation schema", () => {
  it("keeps an invitation when the accounts it names are deleted", () => {
    const references = getTableConfig(invitation).foreignKeys.map((key) => ({
      onDelete: key.onDelete,
      target: key.reference().foreignColumns[0],
    }))

    expect(references).toStrictEqual([
      { onDelete: "set null", target: user.id },
      { onDelete: "set null", target: user.id },
      { onDelete: "set null", target: user.id },
    ])
  })

  it("allows one open invitation per address", () => {
    const unique = getTableConfig(invitation).indexes.filter(({ config }) => config.unique)

    expect(unique.map(({ config }) => config.name)).toStrictEqual(["invitation_open_email_uidx"])
    expect(unique[0]?.config.where).toBeDefined()
  })

  it("names the statuses of a link with these values", () => {
    expect(INVITATION_STATUS).toStrictEqual({ ACCEPTED: "accepted", EXPIRED: "expired", PENDING: "pending", REVOKED: "revoked" })
  })

  it("tells an accepted, revoked, expired and pending link apart", () => {
    const pending = { acceptedAt: null, expiresAt: LATER, revokedAt: null }

    expect(invitationStatus(pending, NOW)).toBe(INVITATION_STATUS.PENDING)
    expect(invitationStatus({ ...pending, expiresAt: NOW }, NOW)).toBe(INVITATION_STATUS.EXPIRED)
    expect(invitationStatus({ ...pending, revokedAt: NOW }, NOW)).toBe(INVITATION_STATUS.REVOKED)
    expect(invitationStatus({ ...pending, acceptedAt: NOW, revokedAt: NOW }, NOW)).toBe(INVITATION_STATUS.ACCEPTED)
  })

  it("takes an address with a role and a language, and only a token of the issued length", () => {
    const valid = { email: ADDRESS, locale: "de-DE", role: ROLE_CODES.ADMIN }

    expect(invitationZodSchemas.createInvitation.safeParse(valid).success).toBe(true)
    expect(invitationZodSchemas.createInvitation.safeParse({ ...valid, email: "ada" }).success).toBe(false)
    expect(invitationZodSchemas.getInvitation.safeParse({ token: "a".repeat(INVITATION_TOKEN_LENGTH) }).success).toBe(true)
    expect(invitationZodSchemas.getInvitation.safeParse({ token: "a" }).success).toBe(false)
  })
})
