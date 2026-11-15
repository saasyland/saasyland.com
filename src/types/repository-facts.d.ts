declare module "virtual:repository-facts" {
  const facts: import("~/scripts/repository-facts").RepositoryFacts
  export const commitEmojis: Readonly<Record<string, string>>
  export const cliApiTables: import("~/scripts/repository-facts").CliApiTables
  export const seededAccounts: import("~/scripts/repository-facts").SeededAccounts
  export default facts
}
