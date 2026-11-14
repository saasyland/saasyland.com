import type { VitePluginEntry } from "./vite.ts"

export const REPOSITORY_FACTS_VITE_PLUGINS = [
  {
    order: 30,
    plugins: async () => {
      const { repositoryFacts } = await import("../../scripts/repository-facts.ts")

      return [repositoryFacts()]
    },
    vitest: true,
  },
] as const satisfies readonly VitePluginEntry[]
