declare module "virtual:repository-facts" {
  const facts: import("~/scripts/repository-facts").RepositoryFacts
  export default facts
}

declare module "virtual:repository-tables" {
  export const commitEmojis: Readonly<Record<string, string>>
  export const cliApiTables: import("~/scripts/repository-facts").CliApiTables
  export const seededAccounts: import("~/scripts/repository-facts").SeededAccounts
  export const flowTables: import("~/scripts/repository-facts").FlowTables
  export const coverageScope: import("~/scripts/repository-facts").CoverageScope
  export const moduleTables: import("~/scripts/repository-facts").ModuleTables
  export const testViewports: import("~/scripts/repository-facts").TestViewports
  export const glossaryTables: import("~/scripts/repository-facts").GlossaryTables
  export const polishContextTerms: readonly string[]
}
