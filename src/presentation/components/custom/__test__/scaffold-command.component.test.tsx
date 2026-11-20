import { STACK_CHOICES, stackArguments, stackZodSchemas } from "@saasyland/stack"
import { render, screen } from "@testing-library/react"
import { expect, it } from "vite-plus/test"

import { CLI_TEMPLATE_SUPPORT, PACKAGE_MANAGER, SCAFFOLD_TARGET } from "~/src/data/cli"

import { ScaffoldCommand } from "~/src/presentation/components/custom/scaffold-command"

const CONTINUED_LINE = " \\\n  "

const answerArgument = (choiceId: string, optionId: string): string =>
  stackArguments(stackZodSchemas.flags.out.parse({ [choiceId]: optionId })).join(" ")

it("prints the command the configurator opens on, one flag per continued line, each for an option the templates generate", () => {
  render(<ScaffoldCommand />)

  const code = screen.getByText((_, element) => element?.tagName === "CODE")
  const [command, ...flags] = code.textContent.split(CONTINUED_LINE)
  const answered = STACK_CHOICES.filter((choice) => CLI_TEMPLATE_SUPPORT.choices[choice.id].length > 0)

  expect(code.closest("pre")).toBeInTheDocument()
  expect(command).toBe(`${PACKAGE_MANAGER.BUN.exec} ${SCAFFOLD_TARGET}`)
  expect(flags).toHaveLength(answered.length)
  for (const [index, choice] of answered.entries()) {
    const supported: readonly string[] = CLI_TEMPLATE_SUPPORT.choices[choice.id]
    const generated = choice.options.filter((option) => supported.includes(option.id))

    expect(generated.map((option) => answerArgument(choice.id, option.id))).toContain(flags[index])
  }
})
