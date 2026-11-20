import { expect, it, vi } from "vite-plus/test"

import { CONTENT_VITE_PLUGINS } from "~/src/data/content.vite"

const fumadocsMdx = vi.hoisted(() => vi.fn(() => [{ name: "fumadocs-mdx" }]))

vi.mock(import("fumadocs-mdx/vite"), () => ({ fumadocsMdx }))

const [mdx, indexes, bundled] = CONTENT_VITE_PLUGINS

it("compiles the MDX content with the Fumadocs configuration", async () => {
  expect(await mdx.plugins()).toStrictEqual([[{ name: "fumadocs-mdx" }]])
  expect(fumadocsMdx).toHaveBeenCalledExactlyOnceWith({ configPath: "./src/integrations/fumadocs/fumadocs.config.ts" })
})

it("builds the content indexes for the app and for Vitest", async () => {
  const [plugin] = await indexes.plugins()

  expect(plugin?.name).toBe("saasyland:content-indexes")
})

it("bundles Fumadocs into the server build, and only the content indexes run under Vitest", async () => {
  const [plugin] = await bundled.plugins()

  expect(plugin?.config()).toStrictEqual({ resolve: { noExternal: ["fumadocs-core", "@fumadocs/base-ui"] } })
  expect(CONTENT_VITE_PLUGINS.map(({ vitest }) => vitest)).toStrictEqual([false, true, false])
})
