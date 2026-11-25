import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { INVITATION_QUERY_KEYS, INVITATION_STATUS, INVITATION_TOKEN_LENGTH } from "~/src/modules/invitation/invitation.constants"
import { invitation } from "~/src/modules/invitation/invitation.schema"
import { invitationExpiry } from "~/src/modules/invitation/invitation.utils"
import { invitationQuery } from "~/src/modules/invitation/use-cases/get-invitation"

import { expectLocalizedAdminPage, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

import { sha256Hex } from "~/src/lib/hex"

import { ROUTES } from "~/src/routes"

const TOKEN = "b".repeat(INVITATION_TOKEN_LENGTH)
const INVITED = "invitee@example.test"

afterEach(() => vi.restoreAllMocks())

describe("invitation page loader", () => {
  it("loads the session and the invitation a well-formed link names before rendering", async () => {
    await db.delete(invitation)
    const sentAt = new Date()
    await db.insert(invitation).values({
      email: INVITED,
      expiresAt: invitationExpiry(sentAt),
      id: "invitation-loader",
      locale: I18N.DEFAULT_LOCALE,
      role: ROLE_CODES.CUSTOMER,
      sentAt,
      tokenHash: await sha256Hex(TOKEN),
    })

    const router = await loadAsAdmin(`${ROUTES.AUTH.INVITE}?${new URLSearchParams({ token: TOKEN }).toString()}`)

    expectLocalizedAdminPage(router)
    expect(router.options.context.queryClient.getQueryData(invitationQuery({ token: TOKEN }).queryKey)).toStrictEqual({
      invitation: { email: INVITED, role: ROLE_CODES.CUSTOMER, status: INVITATION_STATUS.PENDING },
    })
  })

  it.each(["", "?token=too-short"])("loads the session but looks up no invitation for the link %j", async (search) => {
    const router = await loadAsAdmin(`${ROUTES.AUTH.INVITE}${search}`)

    expectLocalizedAdminPage(router)
    expect(router.options.context.queryClient.getQueryCache().findAll({ queryKey: INVITATION_QUERY_KEYS.DETAIL })).toStrictEqual([])
  })
})
