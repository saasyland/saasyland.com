import type { VitePluginEntry } from "./vite.ts"

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
] as const satisfies readonly VitePluginEntry[]
