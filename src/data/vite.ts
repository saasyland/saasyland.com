import type { PluginOption } from "vite-plus"

import * as AREA_VITE_PLUGINS from "./vite.entries.ts"

export interface VitePluginEntry {
  readonly order: number
  readonly plugins: (mode: string) => Promise<PluginOption[]>
  readonly vitest: boolean
}

const AREAS: Readonly<Record<string, readonly VitePluginEntry[]>> = AREA_VITE_PLUGINS

const ENTRIES = Object.values(AREAS)
  .flat()
  .toSorted((first, second) => first.order - second.order)

export const vitePlugins = async ({ mode, vitest }: { mode: string; vitest: boolean }): Promise<PluginOption[]> => {
  const plugins = await Promise.all(ENTRIES.filter((entry) => entry.vitest || !vitest).map((entry) => entry.plugins(mode)))

  return plugins.flat()
}
