import { render, screen } from "@testing-library/react"
import { expect, it } from "vite-plus/test"

import { CLI_CHOICES, CLI_TEMPLATE_SUPPORT, PACKAGE_MANAGER, SCAFFOLD_TARGET } from "~/src/data/cli"

import { ScaffoldCommand } from "~/src/presentation/components/custom/scaffold-command"

const CONTINUED_LINE = " \\\n  "

it("prints the command the configurator opens on, one flag per continued line, each for an option the templates generate", () => {
  render(<ScaffoldCommand />)

  const code = screen.getByText((_, element) => element?.tagName === "CODE")
  const [command, ...flags] = code.textContent.split(CONTINUED_LINE)
  const answered = CLI_CHOICES.filter((choice) => CLI_TEMPLATE_SUPPORT.choices[choice.id].length > 0)

  expect(code.closest("pre")).toBeInTheDocument()
  expect(command).toBe(`${PACKAGE_MANAGER.BUN.exec} ${SCAFFOLD_TARGET}`)
  expect(flags).toHaveLength(answered.length)
  for (const [index, choice] of answered.entries()) {
    const generated = choice.options.filter((option) => CLI_TEMPLATE_SUPPORT.choices[choice.id].includes(option.id))

    expect(generated.map((option) => option.flag)).toContain(flags[index])
  }
})
