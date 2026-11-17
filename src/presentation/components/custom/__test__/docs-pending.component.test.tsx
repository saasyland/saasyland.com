import { render } from "@testing-library/react"
import { expect, it } from "vite-plus/test"

import { DocsPending } from "~/src/presentation/components/custom/docs-pending"

it("marks the docs skeleton as a single busy region", () => {
  const { container } = render(<DocsPending />)

  expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
})
