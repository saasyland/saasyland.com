import type { ReactNode } from "react"

import { render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { PasswordRequirements } from "~/src/presentation/components/custom/auth/password-requirements"

import validations from "~/messages/en-US/auth.validations.json"

const REQUIREMENTS_ID = "password-requirements"
const LENGTH_RULE = validations.atLeastMinCharactersLong.replace("{min}", String(PASSWORD_MIN_LENGTH))

const MessagesProvider = ({ children }: Readonly<{ children: ReactNode }>) => (
  <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
    {children}
  </IntlProvider>
)

const renderWithMessages = (ui: ReactNode): ReturnType<typeof render> => render(ui, { wrapper: MessagesProvider })

describe("password requirements component", () => {
  it("lists the length rule as unmet until the password is long enough, whatever characters it uses", () => {
    const { rerender } = renderWithMessages(<PasswordRequirements id={REQUIREMENTS_ID} password="" />)

    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    expect(screen.getByRole("listitem")).toHaveTextContent(LENGTH_RULE)
    expect(screen.getByText(validations.requirementNotMet)).toHaveClass("sr-only")

    rerender(<PasswordRequirements id={REQUIREMENTS_ID} password={"a".repeat(PASSWORD_MIN_LENGTH - 1)} />)
    expect(screen.getByText(validations.requirementNotMet)).toBeInTheDocument()

    rerender(<PasswordRequirements id={REQUIREMENTS_ID} password={"a".repeat(PASSWORD_MIN_LENGTH)} />)
    expect(screen.getByText(validations.requirementMet)).toHaveClass("sr-only")
  })

  it("says that the password is checked against known data breaches on submit, under the id inputs describe themselves with", () => {
    const { container } = renderWithMessages(<PasswordRequirements id={REQUIREMENTS_ID} password="" />)

    expect(screen.getByText(validations.breachCheck)).toBeVisible()
    expect(container.querySelector(`#${REQUIREMENTS_ID}`)).toContainElement(screen.getByText(validations.breachCheck))
  })
})
