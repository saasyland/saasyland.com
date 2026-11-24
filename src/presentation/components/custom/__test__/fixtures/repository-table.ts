import { screen, within } from "@testing-library/react"

export const tableRows = (): string[][] =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .map((row) =>
      within(row)
        .queryAllByRole("cell")
        .map((cell) => cell.textContent),
    )
