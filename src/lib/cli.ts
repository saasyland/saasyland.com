import { STACK_CHOICES, type Stack, isOptionLegal, resolveAnswers, stackZodSchemas } from "@saasyland/stack"

import { CLI_EXEC, type CliCommand } from "~/src/data/cli"

export const cliCommand = (command: CliCommand): string => `${CLI_EXEC} ${command}`

const keepLegalAnswers = (selection: Stack["selection"]): Stack["selection"] => {
  const kept: Record<string, unknown> = {}
  for (const choice of STACK_CHOICES) {
    const answer = choice.options.find((option) => option.id === selection[choice.id])
    if (answer !== undefined && isOptionLegal(answer, kept)) {
      kept[choice.id] = answer.id
    }
  }
  return kept
}

export const resolveCliAnswers = (selection: Stack["selection"], supported: Stack["support"]["choices"]): Stack["partialAnswers"] =>
  stackZodSchemas.flags.out.parse(resolveAnswers(keepLegalAnswers(selection), supported))
