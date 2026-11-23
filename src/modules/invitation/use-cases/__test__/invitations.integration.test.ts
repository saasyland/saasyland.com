import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation, executeQuery } from "~/src/platform/testing/lib/query"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import {
  AUTH_TEST_PASSWORD,
  browserHeaders,
  emailToken,
  findUser,
  promoteToAdmin,
  signIn,
  signUpAndVerify,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { INVITATION_EMAIL_PURPOSE, INVITATION_STATUS, INVITATION_TOKEN_LENGTH } from "~/src/modules/invitation/invitation.constants"
import { invitation } from "~/src/modules/invitation/invitation.schema"
import { acceptInvitationMutation } from "~/src/modules/invitation/use-cases/accept-invitation"
import { claimInvitationMutation } from "~/src/modules/invitation/use-cases/claim-invitation"
import { createInvitationMutation } from "~/src/modules/invitation/use-cases/create-invitation"
import { invitationQuery } from "~/src/modules/invitation/use-cases/get-invitation"
import { listInvitationsQuery } from "~/src/modules/invitation/use-cases/list-invitations"
import { resendInvitationMutation } from "~/src/modules/invitation/use-cases/resend-invitation"
import { revokeInvitationMutation } from "~/src/modules/invitation/use-cases/revoke-invitation"
import { RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"
import { user } from "~/src/modules/user/user.schema"

import * as ROUTES from "~/src/routes"

const INVITEE_NAME = "Invited Person"

const inviteeEmail = (): string => `invitee-${crypto.randomUUID()}@example.test`

const actAs = (headers: Headers): void => {
  vi.mocked(getRequest).mockReturnValue(new Request(`${TEST_APP_URL}/_serverFn`, { headers }))
}

const signedInAdmin = async () => {
  const admin = await signUpAndVerify()
  await promoteToAdmin(admin.userId)
  actAs(admin.headers)
  return admin
}

const invite = (email: string, role: (typeof ROLE_CODES)[keyof typeof ROLE_CODES] = ROLE_CODES.CUSTOMER) =>
  executeMutation(createInvitationMutation, { email, locale: "pl-PL", role })

const inviteToken = (email: string): string => emailToken(email, ROUTES.ACCEPT_INVITATION)

const linkOf = async (token: string) => {
  const { invitation: link } = await executeQuery(invitationQuery({ token }))
  return link
}

const openInvitation = async (email: string) => {
  const rows = await executeQuery(listInvitationsQuery)
  return rows.find((row) => row.email === email)
}

const openId = async (email: string): Promise<string> => {
  const row = await openInvitation(email)
  if (row === undefined) {
    throw new Error(`No open invitation for ${email}`)
  }
  return row.id
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("inviting a user", () => {
  it("emails a link in the chosen language and lists the invitation as pending, with who sent it", async () => {
    const admin = await signedInAdmin()
    const email = inviteeEmail()

    await expect(invite(email.toUpperCase(), ROLE_CODES.ADMIN)).resolves.toStrictEqual({ email })

    const [sent] = getSentEmails(email)
    expect(sent?.idempotencyKey?.startsWith(`${INVITATION_EMAIL_PURPOSE.INVITATION}/`)).toBe(true)
    expect(sent?.html).toContain('lang="pl-PL"')
    expect(sent?.html).toContain(`/pl-PL${ROUTES.ACCEPT_INVITATION}?token=`)
    await expect(openInvitation(email)).resolves.toMatchObject({
      invitedBy: admin.account.name,
      role: ROLE_CODES.ADMIN,
      status: INVITATION_STATUS.PENDING,
    })
    await expect(linkOf(inviteToken(email))).resolves.toStrictEqual({ email, role: ROLE_CODES.ADMIN, status: INVITATION_STATUS.PENDING })
  })

  it("refuses an address that already has an account or an open invitation", async () => {
    const admin = await signedInAdmin()
    const email = inviteeEmail()
    await invite(email)

    await expect(invite(email)).rejects.toThrow(ERROR_CODES.CONFLICT)
    await expect(invite(admin.account.email)).rejects.toThrow(ERROR_CODES.CONFLICT)
  })

  it("keeps no invitation when its email cannot be sent", async () => {
    await signedInAdmin()
    const email = inviteeEmail()
    for (let sent = 0; sent < RECIPIENT_EMAILS_PER_HOUR; sent += 1) {
      await invite(email)
      await executeMutation(revokeInvitationMutation, { id: await openId(email) })
    }

    await expect(invite(email)).rejects.toThrow(ERROR_CODES.TOO_MANY_REQUESTS)
    await expect(openInvitation(email)).resolves.toBeUndefined()
  })

  it("names no inviter once the admin who invited is deleted", async () => {
    const admin = await signedInAdmin()
    const email = inviteeEmail()
    await invite(email)
    await signedInAdmin()

    await db.delete(user).where(eq(user.id, admin.userId))

    await expect(openInvitation(email)).resolves.toMatchObject({ invitedBy: null })
  })
})

describe("resending and revoking", () => {
  it("sends a new link that replaces the earlier one", async () => {
    await signedInAdmin()
    const email = inviteeEmail()
    await invite(email)
    const first = inviteToken(email)

    await expect(executeMutation(resendInvitationMutation, { id: await openId(email) })).resolves.toStrictEqual({ email })

    const second = inviteToken(email)
    expect(second).not.toBe(first)
    await expect(linkOf(first)).resolves.toBeUndefined()
    await expect(linkOf(second)).resolves.toMatchObject({ status: INVITATION_STATUS.PENDING })
  })

  it("keeps the earlier link when the new one cannot be sent", async () => {
    await signedInAdmin()
    const email = inviteeEmail()
    await invite(email)
    const id = await openId(email)
    for (let sent = 1; sent < RECIPIENT_EMAILS_PER_HOUR; sent += 1) {
      await executeMutation(resendInvitationMutation, { id })
    }
    const last = inviteToken(email)

    await expect(executeMutation(resendInvitationMutation, { id })).rejects.toThrow(ERROR_CODES.TOO_MANY_REQUESTS)
    await expect(linkOf(last)).resolves.toMatchObject({ status: INVITATION_STATUS.PENDING })
  })

  it("stops the link of a revoked invitation and takes it off the list", async () => {
    await signedInAdmin()
    const email = inviteeEmail()
    await invite(email)
    const id = await openId(email)

    await expect(executeMutation(revokeInvitationMutation, { id })).resolves.toStrictEqual({ email })

    await expect(linkOf(inviteToken(email))).resolves.toMatchObject({ status: INVITATION_STATUS.REVOKED })
    await expect(openInvitation(email)).resolves.toBeUndefined()
    await expect(executeMutation(revokeInvitationMutation, { id })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    await expect(executeMutation(resendInvitationMutation, { id })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("lists an invitation whose link expired and refuses to accept it", async () => {
    await signedInAdmin()
    const email = inviteeEmail()
    await invite(email)
    const token = inviteToken(email)
    await db
      .update(invitation)
      .set({ expiresAt: new Date(Date.now() - 1) })
      .where(eq(invitation.email, email))

    await expect(openInvitation(email)).resolves.toMatchObject({ status: INVITATION_STATUS.EXPIRED })
    await expect(linkOf(token)).resolves.toMatchObject({ status: INVITATION_STATUS.EXPIRED })
    actAs(browserHeaders())
    await expect(executeMutation(acceptInvitationMutation, { name: INVITEE_NAME, password: AUTH_TEST_PASSWORD, token })).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )
  })

  it("knows no invitation for a token it never issued", async () => {
    await expect(linkOf("0".repeat(INVITATION_TOKEN_LENGTH))).resolves.toBeUndefined()
  })
})

describe("accepting an invitation", () => {
  it("creates the account with the role and a verified address, signs it in and spends the link", async () => {
    await signedInAdmin()
    const email = inviteeEmail()
    await invite(email, ROLE_CODES.ADMIN)
    const token = inviteToken(email)
    actAs(browserHeaders())

    await expect(
      executeMutation(acceptInvitationMutation, { name: INVITEE_NAME, password: AUTH_TEST_PASSWORD, token }),
    ).resolves.toStrictEqual({ role: ROLE_CODES.ADMIN })

    const created = await findUser(email)
    expect(created).toMatchObject({ emailVerified: true, name: INVITEE_NAME, role: ROLE_CODES.ADMIN })
    const [accepted] = await db.select().from(invitation).where(eq(invitation.email, email))
    expect(accepted?.acceptedBy).toBe(created.id)
    expect(accepted?.acceptedAt).toBeInstanceOf(Date)
    await expect(linkOf(token)).resolves.toMatchObject({ status: INVITATION_STATUS.ACCEPTED })
    await expect(signIn({ email, password: AUTH_TEST_PASSWORD })).resolves.toBeInstanceOf(Headers)
    await expect(executeMutation(acceptInvitationMutation, { name: INVITEE_NAME, password: AUTH_TEST_PASSWORD, token })).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )
  })

  it("keeps the invitation open when the address signed up in the meantime", async () => {
    await signedInAdmin()
    const email = inviteeEmail()
    await invite(email)
    const token = inviteToken(email)
    await signUpAndVerify({ email, name: INVITEE_NAME, password: AUTH_TEST_PASSWORD })
    actAs(browserHeaders())

    await expect(executeMutation(acceptInvitationMutation, { name: INVITEE_NAME, password: AUTH_TEST_PASSWORD, token })).rejects.toThrow()
    await expect(linkOf(token)).resolves.toMatchObject({ status: INVITATION_STATUS.PENDING })
  })

  it("removes the new account when the invitation is revoked while it is created", async () => {
    await signedInAdmin()
    const email = inviteeEmail()
    await invite(email)
    const token = inviteToken(email)
    const { internalAdapter } = await auth.$context
    const createUser = internalAdapter.createUser.bind(internalAdapter)
    vi.spyOn(internalAdapter, "createUser").mockImplementation(async (account, source) => {
      await db.update(invitation).set({ revokedAt: new Date() }).where(eq(invitation.email, email))
      return createUser(account, source)
    })
    actAs(browserHeaders())

    await expect(executeMutation(acceptInvitationMutation, { name: INVITEE_NAME, password: AUTH_TEST_PASSWORD, token })).rejects.toThrow()
    await expect(db.select().from(user).where(eq(user.email, email))).resolves.toStrictEqual([])
  })

  it("creates no account for a link that is not open", async () => {
    await expect(
      auth.api.acceptInvitation({
        body: { name: INVITEE_NAME, password: AUTH_TEST_PASSWORD, token: "0".repeat(INVITATION_TOKEN_LENGTH) },
        headers: browserHeaders(),
      }),
    ).rejects.toThrow("The invitation is no longer open")
  })

  it("gives a signed-in account with the invited address the role", async () => {
    await signedInAdmin()
    const email = inviteeEmail()
    await invite(email, ROLE_CODES.ADMIN)
    const token = inviteToken(email)
    const invitee = await signUpAndVerify({ email, name: INVITEE_NAME, password: AUTH_TEST_PASSWORD })
    const stranger = await signUpAndVerify()

    actAs(stranger.headers)
    await expect(executeMutation(claimInvitationMutation, { token })).rejects.toThrow(ERROR_CODES.NOT_FOUND)

    actAs(invitee.headers)
    await expect(executeMutation(claimInvitationMutation, { token })).resolves.toStrictEqual({ role: ROLE_CODES.ADMIN })
    await expect(findUser(email)).resolves.toMatchObject({ emailVerified: true, role: ROLE_CODES.ADMIN })
    await expect(linkOf(token)).resolves.toMatchObject({ status: INVITATION_STATUS.ACCEPTED })
  })
})
