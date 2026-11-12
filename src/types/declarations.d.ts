declare module "conventional-changelog-conventionalcommits"

declare module "virtual:repository-facts" {
  const facts: import("~/scripts/repository-facts").RepositoryFacts
  export default facts
}
