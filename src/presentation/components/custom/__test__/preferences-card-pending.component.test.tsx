import { expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { PreferencesCardPending } from "~/src/presentation/components/custom/preferences-card-pending"

it("renders a skeleton with the card's header, field and footer", () => {
  const { container } = renderWithRouter(<PreferencesCardPending />)

  expect(container.querySelector("[data-slot=card-header]")).toBeInTheDocument()
  expect(container.querySelector("[data-slot=card-footer]")).toBeInTheDocument()
  expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0)
})
