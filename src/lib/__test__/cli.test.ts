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
  TENANCY,
} from "@saasyland/stack"
import { expect, it } from "vite-plus/test"

import { CLI_COMMAND, CLI_PACKAGE_SPEC, CLI_TEMPLATE_SUPPORT, PACKAGE_MANAGER } from "~/src/data/cli"

import { cliCommand, resolveCliAnswers } from "~/src/lib/cli"

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

it("runs each command with npx from the release channel of the CLI", () => {
  expect(cliCommand(CLI_COMMAND.WHOAMI)).toBe(`${PACKAGE_MANAGER.NPM.exec} ${CLI_PACKAGE_SPEC} ${CLI_COMMAND.WHOAMI}`)
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
