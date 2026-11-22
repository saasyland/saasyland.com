import { PLATFORM } from "@saasyland/stack/api"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createTranslator } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { LICENSE_MACHINES } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { userActivationsQuery } from "~/src/modules/license/use-cases/get-user-activations"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { CustomerMachines } from "~/src/presentation/components/custom/admin/users/license-machines"

import labels from "~/messages/en-US/pages.admin.users.license.json"

const ACCOUNTS = ["ada", "grace", "alan", "edsger"]
const ACTIVATED_AT = new Date("2026-11-12T09:00:00.000Z")

const t = createTranslator({ formats: I18N.FORMATS, locale: "en-US", messages: labels, timeZone: I18N.DEFAULT_TIMEZONE })

const MACHINES: License["userMachines"][] = [
  {
    activations: [{ createdAt: ACTIVATED_AT, id: "activation-linux", label: "Build box", platform: PLATFORM.LINUX }],
    limit: 3,
    state: LICENSE_MACHINES.LISTED,
    userId: "ada",
  },
  { state: LICENSE_MACHINES.NO_KEY, userId: "grace" },
  { state: LICENSE_MACHINES.UNAVAILABLE, userId: "alan" },
]

const renderCell = (userId: string) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(userActivationsQuery({ userIds: ACCOUNTS }).queryKey, { machines: [...MACHINES] })
  return renderAdmin(<CustomerMachines accounts={ACCOUNTS} userId={userId} />, { queryClient })
}

describe("machines of a customer", () => {
  it("counts a licence's machines and lists them on request", async () => {
    renderCell("ada")

    await userEvent.click(await screen.findByRole("button", { name: t("activations.count", { limit: 3, used: 1 }) }))

    const dialog = await screen.findByRole("dialog", { name: labels.activations.title })
    expect(within(dialog).getByText("Build box")).toBeVisible()
    expect(within(dialog).getByText(labels.activations.platforms.linux)).toBeVisible()
  })

  it.each([
    ["has no key yet", "grace", labels.activations.noKeyShort],
    ["cannot be read from Polar", "alan", labels.activations.polarUnavailable],
    ["has no licence", "edsger", labels.activations.noLicense],
  ])("says so when the customer %s", async (_case, userId, shown) => {
    renderCell(userId)

    expect(await screen.findByText(shown)).toBeVisible()
  })

  it("draws a placeholder while Polar answers, and says Polar is unavailable when the read fails", async () => {
    const read = Promise.withResolvers<never>()
    const queryClient = adminQueryClient()
    const { queryKey } = userActivationsQuery({ userIds: ACCOUNTS })
    const asked = queryClient.query({ queryFn: () => read.promise, queryKey }).catch(() => {})
    const { container } = renderAdmin(<CustomerMachines accounts={ACCOUNTS} userId="ada" />, { queryClient })

    await waitFor(() => {
      expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    })
    read.reject(new Error("Polar timed out"))
    await asked
    expect(await screen.findByText(labels.activations.polarUnavailable)).toBeVisible()
  })
})
