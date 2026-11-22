import { screen } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { renderSettings, settingsSession } from "~/src/presentation/components/custom/settings/__test__/fixtures"
import { EmailCard } from "~/src/presentation/components/custom/settings/email-card"

import authSecurityMessages from "~/messages/en-US/auth.security.json"
import changeEmailMessages from "~/messages/en-US/components.custom.change-email-form.json"

const labels = authSecurityMessages.email

describe("email card", () => {
  it.each([
    { badge: labels.verified, emailVerified: true },
    { badge: labels.unverified, emailVerified: false },
  ])("shows the address marked $badge", ({ badge, emailVerified }) => {
    const session = settingsSession({ emailVerified })
    renderSettings(<EmailCard />, { session })

    expect(screen.getByRole("heading", { name: labels.title })).toBeVisible()
    expect(screen.getByText(session.user.email)).toBeVisible()
    expect(screen.getByText(badge)).toBeVisible()
  })

  it("shows the address as not verified when the session is gone", () => {
    renderSettings(<EmailCard />, { session: null })

    expect(screen.getByText(labels.unverified)).toBeVisible()
    expect(screen.queryByText(labels.verified)).not.toBeInTheDocument()
  })

  it("opens the change form in place of its button and closes it again on cancel", async () => {
    const { user } = renderSettings(<EmailCard />)
    await user.click(screen.getByRole("button", { name: labels.change }))

    expect(screen.getByRole("textbox", { name: changeEmailMessages.label })).toBeVisible()
    expect(screen.queryByRole("button", { name: labels.change })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: changeEmailMessages.cancel }))

    expect(screen.queryByRole("textbox", { name: changeEmailMessages.label })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: labels.change })).toBeVisible()
  })
})
