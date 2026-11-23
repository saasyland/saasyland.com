import type { Locator, Page } from "@playwright/test"

import gridMessages from "../../messages/en-US/components.custom.data-grid.json" with { type: "json" }
import { expect } from "./auth"

export { gridMessages }

const startsWith = (text: string): RegExp => new RegExp(`^${text}`, "u")

export const gridOf = (page: Page, label: string): Locator =>
  page.locator("[data-slot=data-grid]").filter({ has: page.getByRole("table", { name: label }) })

export const filterByOption = async (grid: Locator, column: string, option: string): Promise<void> => {
  const page = grid.page()
  await grid.getByRole("button", { name: startsWith(gridMessages.filters.filter) }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("option", { name: startsWith(column) }).click()
  await dialog.getByRole("option", { exact: true, name: option }).click()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
}

export const removeFilter = async (grid: Locator, column: string): Promise<void> => {
  await grid.getByRole("button", { name: gridMessages.filters.remove.replace("{column}", column) }).click()
}

export const sortBy = async (grid: Locator, column: string): Promise<void> => {
  await grid.getByRole("button", { exact: true, name: column }).click()
  await expect(grid.getByRole("table")).toHaveAttribute("aria-busy", "false")
}

export const hideColumn = async (grid: Locator, column: string): Promise<void> => {
  await grid.getByRole("button", { name: `${column} column options` }).click()
  await grid.page().getByRole("menuitem", { name: gridMessages.column.hide }).click()
  await expect(grid.page().getByRole("menu")).toHaveCount(0)
}

export const showColumn = async (grid: Locator, column: string): Promise<void> => {
  await grid.getByRole("button", { name: gridMessages.toolbar.columns }).click()
  await grid.page().getByRole("menuitemcheckbox", { name: column }).click()
  await grid.page().keyboard.press("Escape")
  await expect(grid.page().getByRole("menu")).toHaveCount(0)
}

export const resetLayout = async (grid: Locator): Promise<void> => {
  await grid.getByRole("button", { name: gridMessages.toolbar.reset }).click()
  await expect(grid.getByRole("button", { name: gridMessages.toolbar.reset })).toBeDisabled()
}

export const filteredEmpty = (grid: Locator): Locator => grid.getByRole("status").filter({ hasText: gridMessages.empty.filteredTitle })
