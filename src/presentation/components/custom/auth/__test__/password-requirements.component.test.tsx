import type { ReactNode } from "react"

import { render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { PasswordRequirements } from "~/src/presentation/components/custom/auth/password-requirements"

const MessagesProvider = ({ children }: Readonly<{ children: ReactNode }>) => (
  <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
    {children}
  </IntlProvider>
)

const renderWithMessages = (ui: ReactNode): ReturnType<typeof render> => render(ui, { wrapper: MessagesProvider })

describe("password requirements component", () => {
  it("marks all rules satisfied for a strong password", () => {
    expect.hasAssertions()
    renderWithMessages(<PasswordRequirements confirmPassword="Strong123!" password="Strong123!" />)

    expect(screen.getByText(/at least 8 characters/iu)).toBeInTheDocument()
    expect(screen.getByText(/special character/iu)).toBeInTheDocument()
    expect(screen.getByText(/uppercase/iu)).toBeInTheDocument()
    expect(screen.getByText("Passwords match")).toBeVisible()
    expect(screen.getAllByText("Requirement met")).toHaveLength(4)
    for (const label of screen.getAllByText("Requirement met")) {
      expect(label).toHaveClass("sr-only")
    }
  })

  it("shows all four requirements as unmet while both password fields are empty", () => {
    renderWithMessages(<PasswordRequirements confirmPassword="" password="" />)

    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    expect(screen.getAllByText("Requirement not met")).toHaveLength(4)
    for (const label of screen.getAllByText("Requirement not met")) {
      expect(label).toHaveClass("sr-only")
    }
  })

  it("updates the matching requirement when either password changes", () => {
    const { rerender } = renderWithMessages(<PasswordRequirements confirmPassword="Different1!" password="Strong123!" />)

    expect(screen.getByText("Passwords match").parentElement).toHaveTextContent("Requirement not met")
    rerender(<PasswordRequirements confirmPassword="Strong123!" password="Strong123!" />)
    expect(screen.getByText("Passwords match").parentElement).toHaveTextContent("Requirement met")
    rerender(<PasswordRequirements confirmPassword="Strong123!" password="Changed123!" />)
    expect(screen.getByText("Passwords match").parentElement).toHaveTextContent("Requirement not met")
  })
})
