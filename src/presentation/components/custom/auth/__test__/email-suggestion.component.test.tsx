import type { ReactNode } from "react"

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { EmailSuggestion } from "~/src/presentation/components/custom/auth/email-suggestion"

import authFormMessages from "~/messages/en-US/auth.form.json"

const REGION_ID = "sign-up-email-suggestion"
const MISTYPED_EMAIL = "ada@gmial.com"
const SUGGESTED_EMAIL = "ada@gmail.com"

const MessagesProvider = ({ children }: Readonly<{ children: ReactNode }>) => (
  <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
    {children}
  </IntlProvider>
)

const renderSuggestion = ({ email, isShown }: { email: string; isShown: boolean }) => {
  const onAccept = vi.fn<(email: string) => void>()

  render(<EmailSuggestion email={email} id={REGION_ID} isShown={isShown} onAccept={onAccept} />, { wrapper: MessagesProvider })

  return { onAccept, region: screen.getByRole("status") }
}

describe("email suggestion component", () => {
  it("keeps its status region empty until the field has been left", () => {
    const { region } = renderSuggestion({ email: MISTYPED_EMAIL, isShown: false })

    expect(region).toHaveAttribute("id", REGION_ID)
    expect(region).toBeEmptyDOMElement()
  })

  it("keeps its status region empty when the address needs no correction", () => {
    const { region } = renderSuggestion({ email: SUGGESTED_EMAIL, isShown: true })

    expect(region).toHaveAttribute("id", REGION_ID)
    expect(region).toBeEmptyDOMElement()
  })

  it("offers the corrected address and accepts it when pressed", async () => {
    const { onAccept, region } = renderSuggestion({ email: MISTYPED_EMAIL, isShown: true })
    const button = screen.getByRole("button", { name: SUGGESTED_EMAIL })

    expect(region).toHaveAttribute("id", REGION_ID)
    expect(region).toHaveTextContent(
      authFormMessages.emailSuggestion.replaceAll(/<\/?suggestion>/gu, "").replace("{email}", SUGGESTED_EMAIL),
    )
    expect(region).toContainElement(button)

    await userEvent.setup({ delay: null }).click(button)

    expect(onAccept).toHaveBeenCalledExactlyOnceWith(SUGGESTED_EMAIL)
  })
})
