import { expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { expectMarketingSkeleton, stubMarketingObservers } from "~/src/presentation/components/custom/__test__/fixtures/marketing-pending"
import { WithdrawalPending } from "~/src/presentation/components/custom/withdrawal-pending"

import { ROUTES } from "~/src/routes"

stubMarketingObservers()

it.each([ROUTES.WITHDRAWAL, `/uk-UA${ROUTES.WITHDRAWAL}`])("renders the withdrawal page skeleton at %s", (path) => {
  expectMarketingSkeleton(path, WithdrawalPending)
})

it("draws a label and a field for each detail of the statement, and the confirm button", () => {
  const { container } = renderWithRouter(<WithdrawalPending />)

  expect(container.querySelectorAll(".h-9.w-full.rounded-md")).toHaveLength(3)
  expect(container.querySelectorAll(".h-9.w-40.rounded-md")).toHaveLength(1)
})
