import { expect, it, vi } from "vite-plus/test"

import { CONTENT_VITE_PLUGINS } from "~/src/data/content.vite"

const fumadocsMdx = vi.hoisted(() => vi.fn(() => [{ name: "fumadocs-mdx" }]))

vi.mock(import("fumadocs-mdx/vite"), () => ({ fumadocsMdx }))

const [mdx, bundled] = CONTENT_VITE_PLUGINS

it("compiles the MDX content with the Fumadocs configuration", async () => {
  expect(await mdx.plugins()).toStrictEqual([[{ name: "fumadocs-mdx" }]])
  expect(fumadocsMdx).toHaveBeenCalledExactlyOnceWith({ configPath: "./src/integrations/fumadocs/fumadocs.config.ts" })
})

it("bundles Fumadocs into the server build, and neither plugin runs under Vitest", async () => {
  const plugins = await bundled.plugins()

  expect(plugins.map((plugin) => plugin.config())).toStrictEqual([{ resolve: { noExternal: ["fumadocs-core", "@fumadocs/base-ui"] } }])
  expect(CONTENT_VITE_PLUGINS.map(({ vitest }) => vitest)).toStrictEqual([false, false])
})
