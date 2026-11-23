import { isUnlistedRoute } from "../areas/shared.ts"
import type { VitePluginEntry } from "./vite.ts"

const LOCALE_PREFIX = /^\/[a-z]{2}-[A-Z]{2}(?=\/|$)/u
const FILE_EXTENSION = /\.\w+$/u

const SERVER_ONLY_PACKAGES = [/^drizzle-orm(?:\/|$)/u]

export const shouldPrerender = ({ path }: { path: string }): boolean => {
  if (path.includes("?") || path.includes("#") || FILE_EXTENSION.test(path)) {
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
          importProtection: { client: { specifiers: SERVER_ONLY_PACKAGES } },
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
