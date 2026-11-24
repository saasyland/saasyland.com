import type { VitePluginEntry } from "../../data/vite.ts"

const UNINSTALLED_POLAR_SDK_OPTIONAL_PEERS = [/^@opentelemetry\//u, "ioredis"]

export const POLAR_VITE_PLUGINS = [
  {
    order: 80,
    plugins: () =>
      Promise.resolve([
        {
          config: () => ({ build: { rolldownOptions: { external: UNINSTALLED_POLAR_SDK_OPTIONAL_PEERS } } }),
          name: "saasyland:polar-sdk-optional-peers",
        },
      ]),
    vitest: false,
  },
] as const satisfies readonly VitePluginEntry[]
