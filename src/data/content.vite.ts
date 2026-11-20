import type { VitePluginEntry } from "./vite.ts"

export const CONTENT_VITE_PLUGINS = [
  {
    order: 20,
    plugins: async () => {
      const { fumadocsMdx } = await import("fumadocs-mdx/vite")

      return [fumadocsMdx({ configPath: "./src/integrations/fumadocs/fumadocs.config.ts" })]
    },
    vitest: false,
  },
  {
    order: 20,
    plugins: async () => {
      const { contentIndexes } = await import("../../scripts/content-indexes.ts")

      return [contentIndexes()]
    },
    vitest: true,
  },
  {
    order: 20,
    plugins: () =>
      Promise.resolve([
        { config: () => ({ resolve: { noExternal: ["fumadocs-core", "@fumadocs/base-ui"] } }), name: "saasyland:fumadocs-bundled" },
      ]),
    vitest: false,
  },
] as const satisfies readonly VitePluginEntry[]
