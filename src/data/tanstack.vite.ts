import { isUnlistedRoute } from "./unlisted.ts"
import type { VitePluginEntry } from "./vite.ts"

const LOCALE_PREFIX = /^\/[a-z]{2}-[A-Z]{2}(?=\/|$)/u

export const shouldPrerender = ({ path }: { path: string }): boolean => {
  if (path.includes("?") || path.includes("#")) {
    return false
  }

  return !isUnlistedRoute(path.replace(LOCALE_PREFIX, ""))
}

export const TANSTACK_VITE_PLUGINS = [
  {
    order: 50,
    plugins: async () => {
      const { tanstackStart } = await import("@tanstack/react-start/plugin/vite")

      return [
        tanstackStart({
          prerender: {
            autoStaticPathsDiscovery: true,
            crawlLinks: true,
            enabled: true,
            filter: shouldPrerender,
          },
          router: {
            codeSplittingOptions: { defaultBehavior: [["component"], ["loader"], ["errorComponent"], ["notFoundComponent"]] },
            routeFileIgnorePattern: "__test__",
          },
        }),
      ]
    },
    vitest: false,
  },
] as const satisfies readonly VitePluginEntry[]
