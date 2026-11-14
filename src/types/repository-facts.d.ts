declare module "virtual:repository-facts" {
  const facts: import("~/scripts/repository-facts").RepositoryFacts
  export const commitEmojis: Readonly<Record<string, string>>
  export default facts
}
