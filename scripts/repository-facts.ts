import { globSync, readFileSync } from "node:fs"
import type { Plugin } from "vite-plus"
import * as zod from "zod"

import { COUNTRIES } from "../src/modules/_core/constants/country.ts"
import { CURRENCY_CODES } from "../src/modules/_core/constants/currency.ts"
import { TIMEZONES } from "../src/modules/_core/constants/timezone.ts"

const MODULE_ID = "virtual:repository-facts"
const RESOLVED_MODULE_ID = `\0${MODULE_ID}`

const packageSchema = zod.object({ version: zod.string() })

const countFiles = (pattern: string): number => globSync(pattern).length

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"))

const majorVersionOf = (packageName: string): number => {
  const [major] = packageSchema.parse(readJson(`node_modules/${packageName}/package.json`)).version.split(".")

  return Number(major)
}

const collectRepositoryFacts = () => ({
  countries: COUNTRIES.length,
  currencies: CURRENCY_CODES.length,
  e2eSpecs: countFiles("e2e/specs/*.spec.ts"),
  reactMajor: majorVersionOf("react"),
  tanstackTableMajor: majorVersionOf("@tanstack/react-table"),
  testFiles: countFiles("src/**/*.{test,spec}.{ts,tsx}"),
  timezones: TIMEZONES.length,
  uiComponents: countFiles("src/presentation/components/shadcn/*.tsx"),
})

export type RepositoryFacts = ReturnType<typeof collectRepositoryFacts>

export const repositoryFacts = (): Plugin => ({
  load: (id) => (id === RESOLVED_MODULE_ID ? `export default ${JSON.stringify(collectRepositoryFacts())}` : undefined),
  name: "saasyland:repository-facts",
  resolveId: (id) => (id === MODULE_ID ? RESOLVED_MODULE_ID : undefined),
})
