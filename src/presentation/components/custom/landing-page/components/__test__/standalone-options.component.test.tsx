import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, it, vi } from "vite-plus/test"

import {
  CliChoiceOption,
  CliChoiceRow,
  CliExtraOption,
} from "~/src/presentation/components/custom/landing-page/components/cli-configurator"
import { StationCell } from "~/src/presentation/components/custom/landing-page/components/station-grid"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it("renders standalone choices unselected and hides conditional options without their prerequisite", async () => {
  const user = userEvent.setup()
  render(
    <dl>
      <CliChoiceRow choiceId="framework" label="Framework">
        <CliChoiceOption choiceId="framework" optionId="tanstack" label="TanStack" />
      </CliChoiceRow>
      <CliChoiceRow choiceId="api" label="API">
        <CliChoiceOption choiceId="api" optionId="hono" label="Hono" />
      </CliChoiceRow>
      <CliExtraOption extraId="commerce" label="Commerce" />
    </dl>,
  )
  await user.click(screen.getByRole("button", { name: "TanStack" }))
  await user.click(screen.getByRole("button", { name: "Commerce" }))
  expect(screen.getByRole("button", { name: "TanStack" })).toHaveAttribute("aria-pressed", "false")
  expect(screen.getByRole("button", { name: "Commerce" })).toHaveAttribute("aria-pressed", "false")
  expect(screen.queryByText("API")).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Hono" })).not.toBeInTheDocument()
})

it("keeps a standalone station readable without a hover coordinator", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  )
  render(
    <StationCell
      body="Authentication on your database"
      id="auth"
      loop="cost-curve"
      offsetSeconds={0}
      spec="$0 per user"
      title="Authentication"
    />,
  )
  const heading = screen.getByRole("heading", { name: "Authentication" })
  const cell = heading.parentElement?.parentElement
  if (!cell) {
    throw new Error("Station cell is missing")
  }
  fireEvent.mouseEnter(cell)
  expect(heading).toBeVisible()
  expect(cell).not.toHaveClass("z-10")
  expect(screen.getByText("Authentication on your database")).toHaveClass("text-muted-foreground")
  expect(screen.getByText("$0 per user")).toBeVisible()
})
