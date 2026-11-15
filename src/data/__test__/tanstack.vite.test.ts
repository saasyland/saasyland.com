import { describe, expect, it, vi } from "vite-plus/test"

import { TANSTACK_VITE_PLUGINS, shouldPrerender } from "~/src/data/tanstack.vite"

import { ROUTES } from "~/src/routes"

const tanstackStart = vi.hoisted(() => vi.fn(() => [{ name: "tanstack-start" }]))

vi.mock(import("@tanstack/react-start/plugin/vite"), () => ({ tanstackStart }))

const [start] = TANSTACK_VITE_PLUGINS

describe("TanStack Start Vite plugin", () => {
  it("prerenders the pages it can crawl, splits route code and ignores route tests", async () => {
    expect(await start.plugins()).toStrictEqual([[{ name: "tanstack-start" }]])
    expect(tanstackStart).toHaveBeenCalledExactlyOnceWith({
      prerender: { autoStaticPathsDiscovery: true, crawlLinks: true, enabled: true, filter: shouldPrerender },
      router: {
        codeSplittingOptions: { defaultBehavior: [["component"], ["loader"], ["errorComponent"], ["notFoundComponent"]] },
        routeFileIgnorePattern: "__test__",
      },
    })
    expect(start.vitest).toBe(false)
  })

  it.each([
    [ROUTES.HOME, true],
    [ROUTES.DOCS, true],
    ["/pl-PL/docs", true],
    [ROUTES.API, false],
    [`/de-DE${ROUTES.API}/search`, false],
    [`${ROUTES.DOCS}?search=one`, false],
    [`${ROUTES.HOME}#pricing`, false],
  ])("prerenders %s: %s", (path, prerendered) => {
    expect(shouldPrerender({ path })).toBe(prerendered)
  })
})
