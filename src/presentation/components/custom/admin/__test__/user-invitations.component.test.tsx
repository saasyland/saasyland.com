import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { createTranslator } from "use-intl"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getLocaleName } from "~/src/modules/_core/constants/locale"
import {
  INVITATION_LIFETIME_DAYS,
  INVITATION_MUTATION_KEYS,
  INVITATION_QUERY_KEYS,
  INVITATION_STATUS,
} from "~/src/modules/invitation/invitation.constants"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import type { createInvitationMutation } from "~/src/modules/invitation/use-cases/create-invitation"
import { listInvitationsQuery } from "~/src/modules/invitation/use-cases/list-invitations"
import type { resendInvitationMutation } from "~/src/modules/invitation/use-cases/resend-invitation"
import type { revokeInvitationMutation } from "~/src/modules/invitation/use-cases/revoke-invitation"

import { Route as InvitationsRoute } from "~/src/routes/admin.users.invitations"

import * as download from "~/src/lib/download"

import { adminInvitation } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { adminQueryClient, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"

import authValidationMessages from "~/messages/en-US/auth.validations.json"
import gridMessages from "~/messages/en-US/components.custom.data-grid.json"
import errorsMessages from "~/messages/en-US/errors.json"
import pagesAdminUsersMessages from "~/messages/en-US/pages.admin.users.json"

const create = vi.hoisted(() => vi.fn<NonNullable<typeof createInvitationMutation.mutationFn>>())
const resend = vi.hoisted(() => vi.fn<NonNullable<typeof resendInvitationMutation.mutationFn>>())
const revoke = vi.hoisted(() => vi.fn<NonNullable<typeof revokeInvitationMutation.mutationFn>>())

vi.mock(import("~/src/modules/invitation/use-cases/create-invitation"), () => ({
  createInvitationMutation: { mutationFn: create, mutationKey: INVITATION_MUTATION_KEYS.CREATE },
}))
vi.mock(import("~/src/modules/invitation/use-cases/resend-invitation"), () => ({
  resendInvitationMutation: { mutationFn: resend, mutationKey: INVITATION_MUTATION_KEYS.RESEND },
}))
vi.mock(import("~/src/modules/invitation/use-cases/revoke-invitation"), () => ({
  revokeInvitationMutation: { mutationFn: revoke, mutationKey: INVITATION_MUTATION_KEYS.REVOKE },
}))

const labels = pagesAdminUsersMessages.invitations
const roleLabels = pagesAdminUsersMessages.filters.role.options
const t = createTranslator({ locale: "en-US", messages: pagesAdminUsersMessages, namespace: "invitations" })
const grace = adminInvitation()
const INVITEE = "linus@example.com"
const LANGUAGE: SupportedLocale = "pl-PL"

type User = ReturnType<typeof userEvent.setup>

const renderInvitations = (rows: Invitation["open"][] = [grace]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(listInvitationsQuery.queryKey, rows)
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  return {
    ...renderAdminPage(InvitationsRoute.options.component, { path: "/admin/users/invitations", queryClient }),
    invalidateQueries,
    user: userEvent.setup({ delay: null }),
  }
}

const openInviteDialog = async (user: User): Promise<HTMLElement> => {
  await user.click(screen.getByRole("button", { name: labels.invite }))
  return screen.getByRole("dialog")
}

const choose = async (user: User, field: string, option: string): Promise<void> => {
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: new RegExp(field, "u") }))
  await user.click(screen.getByRole("option", { name: option }))
}

const fillInvitation = async (user: User): Promise<HTMLElement> => {
  const dialog = await openInviteDialog(user)
  await user.click(within(dialog).getByLabelText(labels.dialog.email))
  await user.paste(INVITEE)
  return dialog
}

const confirmRevoke = async (user: User): Promise<HTMLElement> => {
  await user.click(screen.getByRole("button", { name: t("menu", { email: grace.email }) }))
  await user.click(screen.getByRole("menuitem", { name: t("revokeLabel", { email: grace.email }) }))
  return screen.getByRole("alertdialog")
}

beforeEach(() => {
  vi.clearAllMocks()
  create.mockResolvedValue({ email: INVITEE })
  resend.mockResolvedValue({ email: grace.email })
  revoke.mockResolvedValue({ email: grace.email })
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("open invitations", () => {
  it("puts the invite button above the list of open invitations", () => {
    renderInvitations()

    expect(screen.getByRole("button", { name: labels.invite })).toBeVisible()
    expect(screen.getByRole("heading", { level: 2, name: labels.title })).toBeVisible()
    expect(screen.getByText(labels.description)).toBeVisible()
  })

  it("shows each invitation's address, role, state, inviter and dates", () => {
    renderInvitations([
      grace,
      adminInvitation({
        email: INVITEE,
        id: "invitation-linus",
        invitedBy: null,
        role: ROLE_CODES.ADMIN,
        status: INVITATION_STATUS.EXPIRED,
      }),
    ])
    const [header, pending, expired] = within(screen.getByRole("table")).getAllByRole("row")
    if (!header || !pending || !expired) {
      throw new Error("Missing invitation rows")
    }

    for (const heading of Object.values(labels.table)) {
      expect(header).toHaveTextContent(heading)
    }
    expect(pending).toHaveTextContent(grace.email)
    expect(within(pending).getByText(roleLabels.customer)).toBeVisible()
    expect(within(pending).getByText(labels.status.pending)).toBeVisible()
    expect(within(pending).getByText("Ada Lovelace")).toBeVisible()
    expect(within(pending).getByText("Jan 1, 2025")).toHaveAttribute("title", "Jan 1, 2025, 12:00 PM UTC")
    expect(within(pending).getByText("Jan 8, 2025")).toHaveAttribute("title", "Jan 8, 2025, 12:00 PM UTC")
    expect(within(pending).getByText(grace.email)).toHaveAttribute("title", grace.email)
    expect(within(expired).getByText(roleLabels.admin)).toBeVisible()
    expect(within(expired).getByText(labels.status.expired)).toBeVisible()
    expect(within(expired).getByText(labels.deletedInviter)).toBeVisible()
  })

  it("says nobody is waiting for an invitation when none is open", () => {
    renderInvitations([])

    expect(screen.getByRole("status")).toHaveTextContent(labels.empty)
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(1)
  })

  it("exports the invitations with their role, status and inviter as the grid names them", async () => {
    vi.spyOn(download, "downloadFile").mockImplementation(() => {})
    const { user } = renderInvitations([
      grace,
      adminInvitation({
        email: "linus@example.com",
        id: "linus",
        invitedBy: null,
        role: ROLE_CODES.ADMIN,
        status: INVITATION_STATUS.EXPIRED,
      }),
    ])

    await user.click(screen.getByRole("button", { name: gridMessages.toolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    const [, first, second] = vi.mocked(download.downloadFile).mock.calls[0]?.[0].content.split("\r\n") ?? []
    expect(first).toContain(
      `grace@example.com,${pagesAdminUsersMessages.filters.role.options.customer},${labels.status.pending},Ada Lovelace,`,
    )
    expect(second).toContain(
      `linus@example.com,${pagesAdminUsersMessages.filters.role.options.admin},${labels.status.expired},${labels.deletedInviter},`,
    )
  })
})

describe("inviting a user", () => {
  it("sends the invitation with the chosen role and language, then closes and refreshes the list", async () => {
    const { invalidateQueries, user } = renderInvitations()
    const dialog = await fillInvitation(user)
    expect(dialog).toHaveTextContent(t("dialog.description", { days: INVITATION_LIFETIME_DAYS }))
    await choose(user, labels.dialog.role, roleLabels.admin)
    await choose(user, labels.dialog.language, getLocaleName(LANGUAGE))
    await user.click(within(dialog).getByRole("button", { name: labels.dialog.confirm }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(t("feedback.sent", { email: INVITEE }))
    })
    expect(create).toHaveBeenCalledWith({ email: INVITEE, locale: LANGUAGE, role: ROLE_CODES.ADMIN }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: INVITATION_QUERY_KEYS.ALL })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("invites a customer in the admin's own language unless told otherwise", async () => {
    const { user } = renderInvitations()
    const dialog = await fillInvitation(user)
    await user.click(within(dialog).getByRole("button", { name: labels.dialog.confirm }))

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({ email: INVITEE, locale: I18N.DEFAULT_LOCALE, role: ROLE_CODES.CUSTOMER }, expect.anything())
    })
  })

  it("explains an invalid address without sending anything", async () => {
    const { user } = renderInvitations()
    const dialog = await openInviteDialog(user)
    const email = within(dialog).getByLabelText(labels.dialog.email)
    await user.click(email)
    await user.paste("not-an-email")
    fireEvent.blur(email)
    await user.click(within(dialog).getByRole("button", { name: labels.dialog.confirm }))

    expect(email).toHaveAttribute("aria-invalid", "true")
    expect(within(dialog).getByText(authValidationMessages.emailInvalid)).toBeVisible()
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    ["an address that already has an account or an invitation", new AppError(ERROR_CODES.CONFLICT), labels.feedback.conflict],
    ["a failure", new Error("Denied"), errorsMessages.codes.INTERNAL_ERROR],
    ["a missing permission", new AppError(ERROR_CODES.FORBIDDEN), errorsMessages.codes.FORBIDDEN],
  ])("reports %s and keeps the dialog open", async (_kind, error, message) => {
    create.mockRejectedValueOnce(error)
    const { invalidateQueries, user } = renderInvitations()
    const dialog = await fillInvitation(user)
    await user.click(within(dialog).getByRole("button", { name: labels.dialog.confirm }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeVisible()
  })

  it("closes without sending anything when cancelled", async () => {
    const { user } = renderInvitations()
    const dialog = await fillInvitation(user)
    await user.click(within(dialog).getByRole("button", { name: labels.dialog.cancel }))

    expect(create).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("resending an invitation", () => {
  it("sends a new link and refreshes the list", async () => {
    const { invalidateQueries, user } = renderInvitations()
    await user.click(screen.getByRole("button", { name: t("menu", { email: grace.email }) }))
    await user.click(screen.getByRole("menuitem", { name: t("resendLabel", { email: grace.email }) }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(t("feedback.resent", { email: grace.email }))
    })
    expect(resend).toHaveBeenCalledWith({ id: grace.id }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: INVITATION_QUERY_KEYS.ALL })
  })

  it("reports a failed resend without reporting success", async () => {
    resend.mockRejectedValueOnce(new AppError(ERROR_CODES.TOO_MANY_REQUESTS))
    const { invalidateQueries, user } = renderInvitations()
    await user.click(screen.getByRole("button", { name: t("menu", { email: grace.email }) }))
    await user.click(screen.getByRole("menuitem", { name: t("resendLabel", { email: grace.email }) }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.TOO_MANY_REQUESTS)
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})

describe("revoking an invitation", () => {
  it("revokes only after confirmation and refreshes the list", async () => {
    const { invalidateQueries, user } = renderInvitations()
    const dialog = await confirmRevoke(user)
    expect(dialog).toHaveTextContent(t("revokeDialog.description", { email: grace.email }))
    expect(revoke).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole("button", { name: labels.revokeDialog.confirm }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(t("feedback.revoked", { email: grace.email }))
    })
    expect(revoke).toHaveBeenCalledWith({ id: grace.id }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: INVITATION_QUERY_KEYS.ALL })
  })

  it("keeps the invitation when the admin changes their mind", async () => {
    const { user } = renderInvitations()
    const dialog = await confirmRevoke(user)
    await user.click(within(dialog).getByRole("button", { name: labels.revokeDialog.cancel }))

    expect(revoke).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("reports a failed revoke without reporting success", async () => {
    revoke.mockRejectedValueOnce(new AppError(ERROR_CODES.NOT_FOUND))
    const { invalidateQueries, user } = renderInvitations()
    const dialog = await confirmRevoke(user)
    await user.click(within(dialog).getByRole("button", { name: labels.revokeDialog.confirm }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.NOT_FOUND)
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})
