import type { VitePluginEntry } from "./vite.ts"

export const CLOUDFLARE_VITE_PLUGINS = [
  {
    order: 10,
    plugins: async (mode) => {
      const { cloudflare } = await import("@cloudflare/vite-plugin")

      return [
        cloudflare({
          inspectorPort: false,
          persistState: mode === "test" ? { path: ".wrangler/test" } : true,
          remoteBindings: mode !== "test" && process.env["CLOUDFLARE_ENV"] === "development",
          viteEnvironment: { name: "ssr" },
        }),
      ]
    },
    vitest: false,
  },
  {
    order: 70,
    plugins: async () => {
      const { deployedWorker } = await import("../../scripts/deployed-worker.ts")

      return [deployedWorker()]
    },
    vitest: false,
  },
] as const satisfies readonly VitePluginEntry[]
