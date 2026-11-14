import { expect, it } from "vite-plus/test"

import { CLI_CHOICES, CLI_EXTRAS, CLI_MODULES, NONE } from "~/src/data/cli"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

it("keeps scaffold choices and option identifiers unambiguous", () => {
  expect(new Set(CLI_CHOICES.map((choice) => choice.id)).size).toBe(CLI_CHOICES.length)
  for (const choice of CLI_CHOICES) {
    expect(new Set(choice.options.map((option) => option.id)).size).toBe(choice.options.length)
    for (const option of choice.options) {
      expect(option.flag).toMatch(/^--[a-z0-9-]+(?: [a-z0-9-]+)?$/u)
    }
  }
})
it("counts a CLI module as optional only when its question can be answered with none", () => {
  const optionalChoices = CLI_MODULES.flatMap((module) => ("choiceId" in module ? [module.choiceId] : []))
  for (const choiceId of optionalChoices) {
    expect(CLI_CHOICES.find((choice) => choice.id === choiceId)?.options.map((option) => option.id)).toContain(NONE)
  }
  expect(REPOSITORY_FACTS).toMatchObject({
    cliExtras: CLI_EXTRAS.length,
    cliModules: CLI_MODULES.length,
    cliOptionalModules: optionalChoices.length,
  })
})
