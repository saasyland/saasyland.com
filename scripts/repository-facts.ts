import { globSync, readFileSync } from "node:fs"
import type { Plugin } from "vite-plus"
import * as zod from "zod"

const MODULE_ID = "virtual:repository-facts"
const RESOLVED_MODULE_ID = `\0${MODULE_ID}`
const CATALOGUE_LOCALE = "en-US"

const catalogueSchema = zod.record(zod.string(), zod.string())
const packageSchema = zod.object({ version: zod.string() })
const adminSidebarSchema = zod.object({ links: catalogueSchema })

const countFiles = (pattern: string): number => globSync(pattern).length

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"))

const countCatalogueEntries = (catalogue: string): number =>
  Object.keys(catalogueSchema.parse(readJson(`messages/${CATALOGUE_LOCALE}/${catalogue}.json`))).length

const majorVersionOf = (packageName: string): number => {
  const [major] = packageSchema.parse(readJson(`node_modules/${packageName}/package.json`)).version.split(".")

  return Number(major)
}

const countAdminSections = (): number =>
  Object.keys(adminSidebarSchema.parse(readJson(`messages/${CATALOGUE_LOCALE}/pages.admin.sidebar.json`)).links).length

const collectRepositoryFacts = () => ({
  adminSections: countAdminSections(),
  countries: countCatalogueEntries("countries"),
  currencies: countCatalogueEntries("currencies"),
  e2eSpecs: countFiles("e2e/specs/*.spec.ts"),
  reactMajor: majorVersionOf("react"),
  tanstackTableMajor: majorVersionOf("@tanstack/react-table"),
  testFiles: countFiles("src/**/*.{test,spec}.{ts,tsx}"),
  timezones: countCatalogueEntries("timezones"),
  uiComponents: countFiles("src/presentation/components/shadcn/*.tsx"),
})

export type RepositoryFacts = ReturnType<typeof collectRepositoryFacts>

export const repositoryFacts = (): Plugin => ({
  load: (id) => (id === RESOLVED_MODULE_ID ? `export default ${JSON.stringify(collectRepositoryFacts())}` : undefined),
  name: "saasyland:repository-facts",
  resolveId: (id) => (id === MODULE_ID ? RESOLVED_MODULE_ID : undefined),
})
