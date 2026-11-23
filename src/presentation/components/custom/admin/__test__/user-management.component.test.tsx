import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  createAuthSessionFixture,
  createAuthUserMutationResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import type * as AuthSession from "~/src/integrations/better-auth/auth.session"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { MAX_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"
import type { banUserMutation } from "~/src/modules/user/use-cases/ban-user"
import type { createUserMutation } from "~/src/modules/user/use-cases/create-user"
import type { deleteUserMutation } from "~/src/modules/user/use-cases/delete-user"
import { getUsersPageQuery, getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import type { impersonateUserMutation } from "~/src/modules/user/use-cases/impersonate-user"
import type { setUserPasswordMutation } from "~/src/modules/user/use-cases/set-user-password"
import type { setUserRoleMutation } from "~/src/modules/user/use-cases/set-user-role"
import type { unbanUserMutation } from "~/src/modules/user/use-cases/unban-user"
import type { updateUserMutation } from "~/src/modules/user/use-cases/update-user"
import { USER_MUTATION_KEYS, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"

import { Route as UsersRoute } from "~/src/routes/admin.users.all"

import * as download from "~/src/lib/download"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { adminMessages, adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"

import gridMessages from "~/messages/en-US/components.custom.data-grid.json"
import errorsMessages from "~/messages/en-US/errors.json"
import pagesAdminUsersMessages from "~/messages/en-US/pages.admin.users.json"

const ban = vi.hoisted(() => vi.fn<NonNullable<typeof banUserMutation.mutationFn>>())
const unban = vi.hoisted(() => vi.fn<NonNullable<typeof unbanUserMutation.mutationFn>>())
const remove = vi.hoisted(() => vi.fn<NonNullable<typeof deleteUserMutation.mutationFn>>())
const resetPassword = vi.hoisted(() => vi.fn<NonNullable<typeof setUserPasswordMutation.mutationFn>>())
const create = vi.hoisted(() => vi.fn<NonNullable<typeof createUserMutation.mutationFn>>())
const update = vi.hoisted(() => vi.fn<NonNullable<typeof updateUserMutation.mutationFn>>())
const setRole = vi.hoisted(() => vi.fn<NonNullable<typeof setUserRoleMutation.mutationFn>>())
const impersonate = vi.hoisted(() => vi.fn<NonNullable<typeof impersonateUserMutation.mutationFn>>())
const removeUserData = vi.hoisted(() => vi.fn<typeof AuthSession.removeUserData>())

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => ({ ...(await importOriginal()), removeUserData }))
vi.mock(import("~/src/modules/user/use-cases/ban-user"), () => ({
  banUserMutation: { mutationFn: ban, mutationKey: USER_MUTATION_KEYS.BAN },
}))
vi.mock(import("~/src/modules/user/use-cases/unban-user"), () => ({
  unbanUserMutation: { mutationFn: unban, mutationKey: USER_MUTATION_KEYS.UNBAN },
}))
vi.mock(import("~/src/modules/user/use-cases/delete-user"), () => ({
  deleteUserMutation: { mutationFn: remove, mutationKey: USER_MUTATION_KEYS.DELETE },
}))
vi.mock(import("~/src/modules/user/use-cases/set-user-password"), () => ({
  setUserPasswordMutation: { mutationFn: resetPassword, mutationKey: USER_MUTATION_KEYS.SET_PASSWORD },
}))
vi.mock(import("~/src/modules/user/use-cases/create-user"), () => ({
  createUserMutation: { mutationFn: create, mutationKey: USER_MUTATION_KEYS.CREATE },
}))
vi.mock(import("~/src/modules/user/use-cases/update-user"), () => ({
  updateUserMutation: { mutationFn: update, mutationKey: USER_MUTATION_KEYS.UPDATE },
}))
vi.mock(import("~/src/modules/user/use-cases/set-user-role"), () => ({
  setUserRoleMutation: { mutationFn: setRole, mutationKey: USER_MUTATION_KEYS.SET_ROLE },
}))
vi.mock(import("~/src/modules/user/use-cases/impersonate-user"), () => ({
  impersonateUserMutation: { mutationFn: impersonate, mutationKey: USER_MUTATION_KEYS.IMPERSONATE },
}))

const labels = pagesAdminUsersMessages
const menuLabel = (name: string): string => labels.actions.row.menu.replace("{name}", name)
const ada = adminUser()
const FORBIDDEN = new AppError(ERROR_CODES.FORBIDDEN)

const renderUsers = (users: User["select"][] = [ada], { signedInAs = "admin" } = {}) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: signedInAs }))
  queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: users, total: users.length })
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const Page = UsersRoute.options.component
  if (!Page) {
    throw new Error("Missing users page")
  }
  return { ...renderAdmin(<Page />, { queryClient }), invalidateQueries, user: userEvent.setup({ delay: null }) }
}

const openMenu = async (user: ReturnType<typeof userEvent.setup>, name = ada.name) => {
  await user.click(screen.getByRole("button", { name: menuLabel(name) }))
}

const chooseAction = async (user: ReturnType<typeof userEvent.setup>, action: string) => {
  await openMenu(user)
  await user.click(screen.getByRole("menuitem", { name: action }))
}

const fillNewUser = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: labels.actions.addUser }))
  const dialog = screen.getByRole("dialog")
  await user.type(within(dialog).getByLabelText(labels.actions.createDialog.name), "Grace Hopper")
  await user.type(within(dialog).getByLabelText(labels.actions.createDialog.email), "grace@example.com")
  await user.type(within(dialog).getByLabelText(labels.actions.createDialog.password), "StrongerPass1!")
  return dialog
}

const openRoles = async (user: ReturnType<typeof userEvent.setup>) => {
  await openMenu(user)
  await user.click(screen.getByRole("menuitem", { name: labels.actions.row.changeRole }))
}

const menuItems = (): string[] => screen.getAllByRole("menuitem").map((item) => item.textContent)

beforeEach(() => {
  vi.clearAllMocks()
  ban.mockResolvedValue(createAuthUserMutationResult())
  unban.mockResolvedValue(createAuthUserMutationResult())
  remove.mockResolvedValue({ success: true })
  resetPassword.mockResolvedValue({ status: true })
  create.mockResolvedValue(createAuthUserMutationResult({ userId: "grace" }))
  update.mockResolvedValue(createAuthUserMutationResult().user)
  setRole.mockResolvedValue(createAuthUserMutationResult())
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

afterEach(() => {
  localStorage.clear()
})

describe("admin user management", () => {
  it("shows when each account was created and updated in the admin's own time zone, labelled, beside the account's zone", async () => {
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: [ada], total: 1 })
    const Page = UsersRoute.options.component
    if (!Page) {
      throw new Error("Missing users page")
    }
    renderAdmin(
      <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={adminMessages} timeZone="America/New_York">
        <Page />
      </IntlProvider>,
      { queryClient },
    )
    const user = userEvent.setup({ delay: null })
    await user.click(screen.getByRole("button", { name: gridMessages.toolbar.columns }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: labels.table.headers.updatedAt }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: labels.table.headers.timezone }))
    await user.keyboard("{Escape}")

    const [, row] = within(screen.getByRole("table")).getAllByRole("row")
    if (!row) {
      throw new Error("Missing user row")
    }
    expect(within(row).getAllByText("Jan 1, 2025, 7:00 AM EST")).toHaveLength(2)
    expect(within(row).getByText(ada.timezone)).toBeVisible()
  })

  it("renders user details, links each name to its profile and supports individual and page selection", async () => {
    renderUsers([
      ada,
      adminUser({ emailVerified: false, id: "pending", image: "https://example.com/grace.jpg", name: "Grace", twoFactorEnabled: true }),
      adminUser({ banned: true, id: "banned", image: "https://example.com/linus.jpg", name: "Linus" }),
      adminUser({ banned: true, id: "nameless", name: "" }),
    ])
    expect(screen.getAllByText("ada@example.com")[0]).toBeVisible()
    expect(screen.getByRole("link", { name: ada.name })).toHaveAttribute("href", "/admin/users/ada")
    expect(screen.getByRole("img", { name: "Grace" })).toHaveAttribute("src", "https://example.com/grace.jpg")
    const [first] = screen.getAllByRole("checkbox", { name: gridMessages.selection.selectRow })
    if (!first) {
      throw new Error("Missing row checkbox")
    }
    await userEvent.click(first)
    expect(first).toBeChecked()
    const all = screen.getByRole("checkbox", { name: gridMessages.selection.selectPage })
    expect(all).toBePartiallyChecked()
    await userEvent.click(all)
    expect(
      screen
        .getAllByRole("checkbox", { name: gridMessages.selection.selectRow })
        .every(
          (checkbox) => checkbox.getAttribute("aria-checked") === "true" || (checkbox instanceof HTMLInputElement && checkbox.checked),
        ),
    ).toBe(true)
  })

  it("exports the users with their role, status and flags as the table names them", async () => {
    vi.spyOn(download, "downloadFile").mockImplementation(() => {})
    const users = [
      ada,
      adminUser({ emailVerified: false, id: "grace", name: "Grace", role: ROLE_CODES.ADMIN, twoFactorEnabled: true }),
      Object.assign(adminUser({ id: "legacy", name: "Legacy" }), { role: "external-role" }),
    ]
    const { queryClient, user } = renderUsers(users)
    queryClient.setQueryData(getUsersPageQuery({ pageSize: MAX_PAGE_SIZE }).queryKey, {
      pendingVerification: 0,
      rows: users,
      total: users.length,
    })
    await user.click(screen.getByRole("button", { name: gridMessages.toolbar.columns }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: labels.table.headers.twoFactorEnabled }))
    await user.keyboard("{Escape}")

    await user.click(screen.getByRole("button", { name: gridMessages.toolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    const { booleans, headers } = labels.table
    const { role, status } = labels.filters
    expect(vi.mocked(download.downloadFile).mock.calls[0]?.[0].content.replace("\uFEFF", "").split("\r\n").slice(0, 4)).toStrictEqual([
      [headers.user, headers.role, headers.status, headers.emailVerified, headers.twoFactorEnabled, headers.createdAt].join(","),
      `Ada Lovelace <ada@example.com>,${role.options.customer},${status.options.active},${booleans.yes},${booleans.no},2025-01-01T12:00:00.000Z`,
      `Grace <ada@example.com>,${role.options.admin},${status.options.pending},${booleans.no},${booleans.yes},2025-01-01T12:00:00.000Z`,
      `Legacy <ada@example.com>,external-role,${status.options.active},${booleans.yes},${booleans.no},2025-01-01T12:00:00.000Z`,
    ])
  })

  it("offers every action on another customer's row", async () => {
    const { user } = renderUsers()
    await openMenu(user)

    expect(menuItems()).toStrictEqual([
      labels.actions.row.edit,
      labels.actions.row.changeRole,
      labels.actions.row.resetPassword,
      labels.actions.row.impersonate,
      labels.actions.row.ban,
      labels.actions.row.delete,
    ])
  })

  it("keeps the signed-in admin from changing their own role, banning or deleting themselves", async () => {
    const { user } = renderUsers([adminUser({ role: ROLE_CODES.ADMIN })], { signedInAs: ada.id })
    await openMenu(user)

    expect(menuItems()).toStrictEqual([labels.actions.row.edit, labels.actions.row.resetPassword])
  })

  it.each([
    ["an admin", adminUser({ role: ROLE_CODES.ADMIN })],
    ["a banned user", adminUser({ banned: true })],
  ])("does not offer to impersonate %s", async (_kind, target) => {
    const { user } = renderUsers([target])
    await openMenu(user)

    expect(screen.queryByRole("menuitem", { name: labels.actions.row.impersonate })).not.toBeInTheDocument()
  })
})

describe("adding a user", () => {
  it("creates the account with the chosen role and opens its profile", async () => {
    const { invalidateQueries, router, user } = renderUsers()
    const dialog = await fillNewUser(user)
    await user.click(within(dialog).getByRole("button", { name: new RegExp(labels.filters.role.options.customer, "u") }))
    await user.click(screen.getByRole("option", { name: labels.filters.role.options.admin }))
    await user.click(within(dialog).getByRole("button", { name: labels.actions.createDialog.confirm }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/admin/users/grace")
    })
    expect(create).toHaveBeenCalledWith(
      { email: "grace@example.com", name: "Grace Hopper", password: "StrongerPass1!", role: ROLE_CODES.ADMIN },
      expect.anything(),
    )
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: USER_QUERY_KEYS.ALL })
    expect(toast.success).toHaveBeenCalledWith(labels.actions.feedback.createSuccess.replace("{name}", "Test User"))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("explains invalid fields without sending anything", async () => {
    const { user } = renderUsers()
    await user.click(screen.getByRole("button", { name: labels.actions.addUser }))
    const dialog = screen.getByRole("dialog")
    await user.type(within(dialog).getByLabelText(labels.actions.createDialog.email), "not-an-email")
    fireEvent.blur(within(dialog).getByLabelText(labels.actions.createDialog.email))
    await user.click(within(dialog).getByRole("button", { name: labels.actions.createDialog.confirm }))

    expect(within(dialog).getByLabelText(labels.actions.createDialog.email)).toHaveAttribute("aria-invalid", "true")
    expect(within(dialog).getByLabelText(labels.actions.createDialog.password)).toHaveAttribute("aria-invalid", "true")
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    ["a failure", new Error("Denied"), errorsMessages.codes.INTERNAL_ERROR],
    ["a missing permission", FORBIDDEN, errorsMessages.codes.FORBIDDEN],
  ])("reports %s and stays on the list", async (_kind, error, message) => {
    create.mockRejectedValueOnce(error)
    const { invalidateQueries, router, user } = renderUsers()
    const dialog = await fillNewUser(user)
    await user.click(within(dialog).getByRole("button", { name: labels.actions.createDialog.confirm }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
    expect(router.state.location.pathname).toBe("/admin")
    expect(invalidateQueries).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeVisible()
  })

  it("closes without sending anything when cancelled", async () => {
    const { user } = renderUsers()
    await user.click(screen.getByRole("button", { name: labels.actions.addUser }))
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: labels.actions.createDialog.cancel }))

    expect(create).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("editing a user", () => {
  it("renames the user and refreshes the users", async () => {
    const { invalidateQueries, user } = renderUsers()
    await chooseAction(user, labels.actions.row.edit)
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveTextContent(ada.email)
    const name = within(dialog).getByLabelText(labels.actions.editDialog.name)
    await user.clear(name)
    await user.type(name, "Augusta Ada King")
    await user.click(within(dialog).getByRole("button", { name: labels.actions.editDialog.confirm }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.actions.feedback.editSuccess)
    })
    expect(update).toHaveBeenCalledWith({ name: "Augusta Ada King", userId: ada.id }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: USER_QUERY_KEYS.ALL })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("refuses an empty name", async () => {
    const { user } = renderUsers()
    await chooseAction(user, labels.actions.row.edit)
    const dialog = screen.getByRole("dialog")
    await user.clear(within(dialog).getByLabelText(labels.actions.editDialog.name))
    await user.click(within(dialog).getByRole("button", { name: labels.actions.editDialog.confirm }))

    expect(within(dialog).getByLabelText(labels.actions.editDialog.name)).toHaveAttribute("aria-invalid", "true")
    expect(update).not.toHaveBeenCalled()
  })

  it.each([
    ["a failure", new Error("Denied"), errorsMessages.codes.INTERNAL_ERROR],
    ["a missing permission", FORBIDDEN, errorsMessages.codes.FORBIDDEN],
  ])("reports %s and keeps the dialog open", async (_kind, error, message) => {
    update.mockRejectedValueOnce(error)
    const { invalidateQueries, user } = renderUsers()
    await chooseAction(user, labels.actions.row.edit)
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: labels.actions.editDialog.confirm }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
    expect(invalidateQueries).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeVisible()
  })

  it("closes without sending anything when cancelled", async () => {
    const { user } = renderUsers()
    await chooseAction(user, labels.actions.row.edit)
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: labels.actions.editDialog.cancel }))

    expect(update).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("changing a user's role", () => {
  it("marks the current role and grants another one", async () => {
    const { invalidateQueries, user } = renderUsers()
    await openRoles(user)
    expect(screen.getByRole("menuitemradio", { name: labels.filters.role.options.customer })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("menuitemradio", { name: labels.filters.role.options.customer })).toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("menuitemradio", { name: labels.filters.role.options.admin }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        labels.actions.feedback.roleSuccess.replace("{name}", ada.name).replace("{role}", labels.filters.role.options.admin),
      )
    })
    expect(setRole).toHaveBeenCalledWith({ role: ROLE_CODES.ADMIN, userId: ada.id }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: USER_QUERY_KEYS.ALL })
  })

  it.each([
    ["a failure", new Error("Denied"), errorsMessages.codes.INTERNAL_ERROR],
    ["a missing permission", FORBIDDEN, errorsMessages.codes.FORBIDDEN],
  ])("reports %s without reporting success", async (_kind, error, message) => {
    setRole.mockRejectedValueOnce(error)
    const { invalidateQueries, user } = renderUsers()
    await openRoles(user)
    await user.click(screen.getByRole("menuitemradio", { name: labels.filters.role.options.admin }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})

describe("impersonating a user", () => {
  it("signs in as the user, drops the admin's cached data and opens their workspace", async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof impersonate>>>()
    impersonate.mockReturnValueOnce(pending.promise)
    const { queryClient, router, user } = renderUsers()
    await chooseAction(user, labels.actions.row.impersonate)
    expect(screen.getByRole("button", { name: menuLabel(ada.name) })).toHaveAttribute("data-pending", "true")

    await act(async () => {
      pending.resolve({ session: createAuthSessionFixture().session, user: createAuthUserMutationResult().user })
      await pending.promise
    })
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app")
    })
    expect(impersonate).toHaveBeenCalledWith({ userId: ada.id }, expect.anything())
    expect(removeUserData).toHaveBeenCalledExactlyOnceWith(queryClient)
    expect(toast.success).toHaveBeenCalledWith(labels.actions.feedback.impersonateSuccess.replace("{name}", ada.name))
  })

  it.each([
    ["a failure", new Error("Denied"), errorsMessages.codes.INTERNAL_ERROR],
    ["a missing permission", FORBIDDEN, errorsMessages.codes.FORBIDDEN],
  ])("reports %s and stays signed in as the admin", async (_kind, error, message) => {
    impersonate.mockRejectedValueOnce(error)
    const { router, user } = renderUsers()
    await chooseAction(user, labels.actions.row.impersonate)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
    expect(removeUserData).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe("/admin")
  })
})

describe("banning a user", () => {
  it("bans only after confirmation", async () => {
    const { invalidateQueries, user } = renderUsers()
    await chooseAction(user, labels.actions.row.ban)
    const dialog = screen.getByRole("alertdialog")
    expect(dialog).toHaveTextContent(ada.name)
    expect(ban).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole("button", { name: labels.actions.banDialog.confirm }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.actions.feedback.banSuccess)
    })
    expect(ban).toHaveBeenCalledWith({ userId: ada.id }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: USER_QUERY_KEYS.ALL })
  })

  it("leaves the user alone when the ban is cancelled", async () => {
    const { user } = renderUsers()
    await chooseAction(user, labels.actions.row.ban)
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: labels.actions.banDialog.cancel }))

    expect(ban).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it.each([
    ["a failure", new Error("Denied"), errorsMessages.codes.INTERNAL_ERROR],
    ["a missing permission", FORBIDDEN, errorsMessages.codes.FORBIDDEN],
  ])("reports %s without reporting success", async (_kind, error, message) => {
    ban.mockRejectedValueOnce(error)
    const { invalidateQueries, user } = renderUsers()
    await chooseAction(user, labels.actions.row.ban)
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: labels.actions.banDialog.confirm }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it("unbans a banned user straight away", async () => {
    const { invalidateQueries, user } = renderUsers([adminUser({ banned: true })])
    await chooseAction(user, labels.actions.row.unban)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.actions.feedback.unbanSuccess)
    })
    expect(unban).toHaveBeenCalledWith({ userId: ada.id }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: USER_QUERY_KEYS.ALL })
  })

  it("reports a failed unban", async () => {
    unban.mockRejectedValueOnce(FORBIDDEN)
    const { user } = renderUsers([adminUser({ banned: true })])
    await chooseAction(user, labels.actions.row.unban)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.FORBIDDEN)
    })
    expect(toast.success).not.toHaveBeenCalled()
  })
})

describe("deleting a user", () => {
  it("requires confirmation to delete, disables confirmation while saving and stays on the list", async () => {
    const pending = Promise.withResolvers<{ success: boolean }>()
    remove.mockReturnValueOnce(pending.promise)
    const { invalidateQueries, router, user } = renderUsers()
    await chooseAction(user, labels.actions.row.delete)
    const dialog = screen.getByRole("alertdialog")
    expect(dialog).toHaveTextContent(ada.name)
    expect(remove).not.toHaveBeenCalled()
    const confirmation = within(dialog).getByRole("button", { name: labels.actions.deleteDialog.confirm })
    await user.click(confirmation)
    await waitFor(() => {
      expect(confirmation).toBeDisabled()
    })
    await act(async () => {
      pending.resolve({ success: true })
      await pending.promise
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.actions.feedback.deleteSuccess)
    })
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: USER_QUERY_KEYS.ALL })
    expect(router.state.location.pathname).toBe("/admin")
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it.each([
    ["a failure", new Error("Denied"), errorsMessages.codes.INTERNAL_ERROR],
    ["a missing permission", FORBIDDEN, errorsMessages.codes.FORBIDDEN],
  ])("reports %s and preserves the user", async (_kind, error, message) => {
    remove.mockRejectedValueOnce(error)
    const { user } = renderUsers()
    await chooseAction(user, labels.actions.row.delete)
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: labels.actions.deleteDialog.confirm }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByText(ada.name)).toBeInTheDocument()
  })
})

describe("resetting a password", () => {
  it("cancels a password reset without sending a request", async () => {
    const { user } = renderUsers()
    await chooseAction(user, labels.actions.row.resetPassword)
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: labels.actions.resetPasswordDialog.cancel }))
    expect(resetPassword).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it.each([false, true])("submits a validated password reset and reports the outcome (error: %s)", async (fails) => {
    const pending = Promise.withResolvers<{ status: boolean }>()
    resetPassword.mockReturnValueOnce(pending.promise)
    const { user, invalidateQueries } = renderUsers()
    await chooseAction(user, labels.actions.row.resetPassword)
    const dialog = screen.getByRole("dialog")
    const input = within(dialog).getByLabelText(labels.actions.resetPasswordDialog.password)
    await user.type(input, "StrongerPass1!")
    fireEvent.blur(input)
    const submit = within(dialog).getByRole("button", { name: labels.actions.resetPasswordDialog.confirm })
    await user.click(submit)
    await waitFor(() => {
      expect(submit).toHaveAttribute("aria-disabled", "true")
    })
    expect(resetPassword).toHaveBeenCalledWith({ newPassword: "StrongerPass1!", userId: ada.id }, expect.anything())
    await act(async () => {
      if (fails) {
        pending.reject(FORBIDDEN)
      } else {
        pending.resolve({ status: true })
      }
      await pending.promise.catch(() => {})
    })
    if (fails) {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.FORBIDDEN)
      expect(invalidateQueries).not.toHaveBeenCalled()
    } else {
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(labels.actions.feedback.resetPasswordSuccess)
      })
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: USER_QUERY_KEYS.ALL })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    }
  })
})

describe("server user pagination", () => {
  it("requests another server page and resets to page one when sorting changes", async () => {
    const queryClient = adminQueryClient()
    const firstPage = Array.from({ length: 10 }, (_, index) => adminUser({ id: `first-${index}`, name: `Member ${index}` }))
    queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: firstPage, total: 11 })
    queryClient.setQueryData(getUsersPageQuery({ pageIndex: 1 }).queryKey, {
      pendingVerification: 0,
      rows: [adminUser({ name: "Last member" })],
      total: 11,
    })
    for (const desc of [false, true]) {
      queryClient.setQueryData(getUsersPageQuery({ sorting: [{ desc, id: "user" }] }).queryKey, {
        pendingVerification: 0,
        rows: [adminUser({ name: "Sorted member" })],
        total: 11,
      })
    }
    const Page = UsersRoute.options.component
    if (!Page) {
      throw new Error("Missing users page")
    }
    renderAdmin(<Page />, { queryClient })
    await userEvent.click(screen.getByRole("button", { name: "Next page" }))
    expect(await screen.findByText("Last member")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: labels.table.headers.user }))
    expect(await screen.findByText("Sorted member")).toBeVisible()
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled()
  })
})
