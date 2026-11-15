import { render, screen } from "@testing-library/react"
import { expect, it } from "vite-plus/test"

import { PACKAGE_MANAGER, SCAFFOLD_TARGET } from "~/src/data/cli"

import { ScaffoldCommand } from "~/src/presentation/components/custom/scaffold-command"

it("prints the scaffold command of the current release channel in a code block, one flag per continued line", () => {
  render(<ScaffoldCommand flags={["--framework tanstack", "--no-billing"]} />)

  const code = screen.getByText((_, element) => element?.tagName === "CODE")
  expect(code.closest("pre")).toBeInTheDocument()
  expect(code.textContent).toBe(`${PACKAGE_MANAGER.BUN.exec} ${SCAFFOLD_TARGET} \\\n  --framework tanstack \\\n  --no-billing`)
})
