import type { EnvironmentOptions } from "vite-plus"

import type { VitePluginEntry } from "./vite.ts"

const CLIENT_ENVIRONMENT = "client"
const ZOD_CONFIG = /[\\/]src[\\/]integrations[\\/]zod[\\/]zod\.config\.ts$/u

export const zodConfigChunk = (environment: string): EnvironmentOptions => {
  if (environment !== CLIENT_ENVIRONMENT) {
    return {}
  }

  return { build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: "zod", test: ZOD_CONFIG }] } } } } }
}

export const CORE_VITE_PLUGINS = [
  {
    order: 40,
    plugins: async () => {
      const [{ default: tailwindcss }, { unusedPrimitivesPlugin }] = await Promise.all([
        import("@tailwindcss/vite"),
        import("../../scripts/unused-primitives.ts"),
      ])

      return [unusedPrimitivesPlugin(), tailwindcss()]
    },
    vitest: false,
  },
  {
    order: 60,
    plugins: async () => {
      const { default: viteReact } = await import("@vitejs/plugin-react")

      return [viteReact()]
    },
    vitest: true,
  },
  {
    order: 60,
    plugins: () => Promise.resolve([{ configEnvironment: zodConfigChunk, name: "saasyland:zod-config-chunk" }]),
    vitest: false,
  },
] as const satisfies readonly VitePluginEntry[]
