import { expect, it } from "vite-plus/test"

import { REPOSITORY_FACTS_VITE_PLUGINS } from "~/src/data/repository-facts.vite"

const [facts] = REPOSITORY_FACTS_VITE_PLUGINS

it("measures the repository for the app and for Vitest", async () => {
  const [plugin] = await facts.plugins()

  expect(plugin?.name).toBe("saasyland:repository-facts")
  expect(facts.vitest).toBe(true)
})
