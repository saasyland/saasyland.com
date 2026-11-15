import stack from "@saasyland/stack/package.json" with { type: "json" }
import { expect, it } from "vite-plus/test"

import {
  CLI_CHOICES,
  CLI_EXTRAS,
  CLI_MODULES,
  CLI_PACKAGE,
  CLI_PACKAGE_SPEC,
  CLI_RELEASE_CHANNEL,
  NONE,
  NPM_DIST_TAG,
} from "~/src/data/cli"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

const PRERELEASE = /^\d+\.\d+\.\d+-(?<channel>[a-z]+)\.\d+$/u

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

it("runs the CLI from the npm tag that the installed @saasyland/stack release was published on", () => {
  expect(CLI_RELEASE_CHANNEL).toBe(PRERELEASE.exec(stack.version)?.groups?.["channel"] ?? NPM_DIST_TAG.LATEST)
  expect(CLI_PACKAGE_SPEC).toBe(`${CLI_PACKAGE}@${CLI_RELEASE_CHANNEL}`)
})
