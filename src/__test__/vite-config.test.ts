import type { PluginOption } from "vite-plus"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { shouldPrerender } from "~/src/lib/prerender"

import viteConfig, { VITE_PLUGINS } from "~/vite.config"

const cloudflare = vi.hoisted(() => vi.fn(() => [{ name: "cloudflare" }]))
const tanstackStart = vi.hoisted(() => vi.fn(() => [{ name: "tanstack-start" }]))

vi.mock(import("@cloudflare/vite-plugin"), () => ({ cloudflare }))
vi.mock(import("@tanstack/react-start/plugin/vite"), () => ({ tanstackStart }))
vi.mock("@tailwindcss/vite", () => ({ default: () => [{ name: "tailwindcss" }] }))
vi.mock("@vitejs/plugin-react", () => ({ default: () => [{ name: "react" }] }))
vi.mock(import("fumadocs-mdx/vite"), () => ({ fumadocsMdx: () => [{ name: "fumadocs-mdx" }] }))

const namesOf = async (option: PluginOption): Promise<string[]> => {
  const plugin = await option

  if (Array.isArray(plugin)) {
    const names = await Promise.all(plugin.map((nested) => namesOf(nested)))

    return names.flat()
  }

  return plugin === false || plugin === null || plugin === undefined ? [] : [plugin.name]
}

const VITE_PLUS_PLUGIN_PREFIX = "vite-plus:"

const loadedPlugins = async (mode: string): Promise<string[]> => {
  const names = await namesOf(viteConfig({ command: "build", mode }).plugins ?? [])

  return names.filter((name) => !name.startsWith(VITE_PLUS_PLUGIN_PREFIX))
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("the Vite plugins", () => {
  it("loads every plugin of a build in order, the Worker first and the deployed Worker after prerendering", async () => {
    vi.stubEnv("VITEST", "false")

    expect(await loadedPlugins(ENVIRONMENT.PRODUCTION)).toStrictEqual([
      "cloudflare",
      "fumadocs-mdx",
      "saasyland:fumadocs-bundled",
      "saasyland:content-indexes",
      "saasyland:repository-facts",
      "unused-primitives",
      "tailwindcss",
      "tanstack-start",
      "react",
      "saasyland:zod-config-chunk",
      "saasyland:deployed-worker",
      "saasyland:polar-sdk-optional-peers",
    ])
  })

  it("loads only the content indexes, the repository facts and React under Vitest", async () => {
    expect(await loadedPlugins(ENVIRONMENT.TEST)).toStrictEqual(["saasyland:content-indexes", "saasyland:repository-facts", "react"])
    expect(VITE_PLUGINS.filter(({ vitest }) => vitest)).toHaveLength(3)
  })

  it("runs the test build on its own local state and no remote binding", async () => {
    vi.stubEnv("VITEST", "false")

    await loadedPlugins(ENVIRONMENT.TEST)

    expect(cloudflare).toHaveBeenLastCalledWith({
      inspectorPort: false,
      persistState: { path: ".wrangler/test" },
      remoteBindings: false,
      viteEnvironment: { name: "ssr" },
    })
  })

  it.each([ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION])(
    "keeps the state of %s in .wrangler/state and never connects a remote binding",
    async (environment) => {
      vi.stubEnv("VITEST", "false")

      await loadedPlugins(environment)

      expect(cloudflare).toHaveBeenLastCalledWith(expect.objectContaining({ persistState: true, remoteBindings: false }))
    },
  )

  it("prerenders the pages it can crawl, splits route code, ignores route tests and keeps the ORM out of the browser", async () => {
    vi.stubEnv("VITEST", "false")

    await loadedPlugins(ENVIRONMENT.PRODUCTION)

    expect(tanstackStart).toHaveBeenLastCalledWith({
      importProtection: { client: { specifiers: [/^drizzle-orm(?:\/|$)/u] } },
      prerender: { autoStaticPathsDiscovery: true, crawlLinks: true, enabled: true, filter: shouldPrerender },
      router: {
        codeSplittingOptions: { defaultBehavior: [["component"], ["loader"], ["errorComponent"], ["notFoundComponent"]] },
        routeFileIgnorePattern: "__test__",
      },
    })
  })
})
