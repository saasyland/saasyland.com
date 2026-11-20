import {
  ARCHITECTURE,
  AUTH,
  CHOICE_GROUP,
  CONTENT,
  DATABASE,
  DEPLOYMENT,
  EMAIL,
  FRAMEWORK,
  LIBRARY,
  NONE,
  ORM,
  PROVIDER,
  RUNTIME,
  STACK_CHOICES,
  STACK_EXTRAS,
  STACK_MODULES,
  TENANCY,
} from "@saasyland/stack"
import stack from "@saasyland/stack/package.json" with { type: "json" }
import { posix } from "node:path"
import { expect, it } from "vite-plus/test"

import {
  CLI_COMMAND,
  CLI_GENERATION,
  CLI_GENERATION_VALUES,
  CLI_INIT_COMMAND,
  CLI_PACKAGE,
  CLI_PACKAGE_SPEC,
  CLI_RELEASE_CHANNEL,
  CLI_TEMPLATE_SUPPORT,
  NPM_DIST_TAG,
  PACKAGE_MANAGER,
  SCAFFOLD_DIR,
  resolveCliAnswers,
} from "~/src/data/cli"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import english from "~/messages/en-US/pages.landing.json"
import root from "~/package.json"
import motion from "~/remotion/package.json"
import motionTypes from "~/remotion/tsconfig.json"

const PRERELEASE = /^\d+\.\d+\.\d+-(?<channel>[a-z]+)\.\d+$/u
const CARET_RANGE = /^\^/u
const VIDEO_SHARED_PACKAGES = ["lucide-react", "react", "react-dom"] as const

const INIT_YES_ANSWERS = {
  architecture: ARCHITECTURE.MONOLITH,
  auth: AUTH.BETTER_AUTH,
  billing: NONE,
  content: CONTENT.MDX,
  database: DATABASE.SQLITE,
  deployment: DEPLOYMENT.CLOUDFLARE,
  email: EMAIL.RESEND,
  [CHOICE_GROUP.EXTRAS]: [],
  framework: FRAMEWORK.TANSTACK,
  library: LIBRARY.REACT,
  orm: ORM.DRIZZLE,
  provider: PROVIDER.D1,
  runtime: RUNTIME.NODE,
  tenancy: TENANCY.SINGLE,
}

interface RuledOption {
  readonly id: string
  readonly unavailableWhen?: Readonly<Record<string, readonly string[]>>
  readonly visibleWhen?: Readonly<Record<string, readonly string[]>>
}

const ruled = (options: readonly RuledOption[]): string[] =>
  options.flatMap((option) => [...Object.keys(option.unavailableWhen ?? {}), ...Object.keys(option.visibleWhen ?? {})])

const sorted = (ids: readonly string[]): string[] => ids.toSorted()

const installed = (entry: string): string => `./${posix.join("node_modules", stack.name, entry)}`

it("labels every question, option and extra of the stack in the configurator's messages", () => {
  for (const choice of STACK_CHOICES) {
    expect(sorted(Object.keys(english.cli.choices[choice.id].options))).toStrictEqual(sorted(choice.options.map((option) => option.id)))
  }
  expect(sorted(Object.keys(english.cli.choices.extras.options))).toStrictEqual(sorted(STACK_EXTRAS.map((extra) => extra.id)))
})

it("counts a CLI module as optional only when its question can be answered with none", () => {
  const optionalChoices = STACK_MODULES.flatMap((module) => ("choiceId" in module ? [module.choiceId] : []))
  for (const choiceId of optionalChoices) {
    expect(STACK_CHOICES.find((choice) => choice.id === choiceId)?.options.map((option) => option.id)).toContain(NONE)
  }
  expect(REPOSITORY_FACTS).toMatchObject({
    cliExtras: STACK_EXTRAS.length,
    cliModules: STACK_MODULES.length,
    cliOptionalModules: optionalChoices.length,
  })
})

it("rules an option out only by answers to earlier questions, and explains every rule beside its question", () => {
  const asked: string[] = []
  for (const choice of STACK_CHOICES) {
    for (const choiceId of ruled(choice.options)) {
      expect(asked).toContain(choiceId)
    }
    expect("note" in english.cli.choices[choice.id]).toBe(ruled(choice.options).length > 0)
    asked.push(choice.id)
  }
  for (const choiceId of ruled(STACK_EXTRAS)) {
    expect(asked).toContain(choiceId)
  }
  expect(english.cli.choices.extras.note).not.toBe("")
})

it("opens on the answers init --yes resolves, and re-resolves only the answers a changed answer rules out", () => {
  expect(resolveCliAnswers({}, CLI_TEMPLATE_SUPPORT.choices)).toStrictEqual(INIT_YES_ANSWERS)
  expect(resolveCliAnswers({ ...INIT_YES_ANSWERS, deployment: DEPLOYMENT.VERCEL }, CLI_TEMPLATE_SUPPORT.choices)).toStrictEqual({
    ...INIT_YES_ANSWERS,
    database: DATABASE.POSTGRES,
    deployment: DEPLOYMENT.VERCEL,
    provider: PROVIDER.NEON,
  })
})

it("runs the CLI from the npm tag that the installed @saasyland/stack release was published on", () => {
  expect(CLI_RELEASE_CHANNEL).toBe(PRERELEASE.exec(stack.version)?.groups?.["channel"] ?? NPM_DIST_TAG.LATEST)
  expect(CLI_PACKAGE_SPEC).toBe(`${CLI_PACKAGE}@${CLI_RELEASE_CHANNEL}`)
})

it("passes the generation status and the npm init command to the copy that depends on them", () => {
  expect(CLI_INIT_COMMAND).toBe(`${PACKAGE_MANAGER.NPM.exec} ${CLI_PACKAGE_SPEC} ${CLI_COMMAND.INIT} ${SCAFFOLD_DIR}`)
  expect(CLI_GENERATION_VALUES).toStrictEqual({ generation: CLI_GENERATION, initCommand: CLI_INIT_COMMAND })
})

it("pins the landing videos, which import this file, to the same @saasyland/stack and points their types at its entry points", () => {
  const motionDependencies: Readonly<Record<string, string>> = motion.dependencies
  const rootDependencies: Readonly<Record<string, string>> = root.dependencies

  expect(motionDependencies[stack.name]).toBe(rootDependencies[stack.name])
  expect(motionTypes.compilerOptions.paths).toMatchObject({
    [stack.name]: [installed(stack.exports["."].types)],
    [`${stack.name}/cli`]: [installed(stack.exports["./cli"].types)],
  })
})

it("pins lucide-react, React and React DOM in the landing videos, which render the website's navigation and its icons, to the lowest versions the website accepts", () => {
  expect(VIDEO_SHARED_PACKAGES.map((name) => motion.dependencies[name])).toStrictEqual(
    VIDEO_SHARED_PACKAGES.map((name) => root.dependencies[name].replace(CARET_RANGE, "")),
  )
})
