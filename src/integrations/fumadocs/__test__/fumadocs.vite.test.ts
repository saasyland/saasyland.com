import { expect, it, vi } from "vite-plus/test"

import { fumadocsVitePlugins } from "~/src/integrations/fumadocs/fumadocs.vite"

const fumadocsMdx = vi.hoisted(() => vi.fn(() => [{ name: "fumadocs-mdx" }]))

vi.mock(import("fumadocs-mdx/vite"), () => ({ fumadocsMdx }))

it("compiles the MDX content with the Fumadocs configuration and bundles Fumadocs into the server build", async () => {
  const [mdx, bundled] = await fumadocsVitePlugins()

  expect(mdx).toStrictEqual([{ name: "fumadocs-mdx" }])
  expect(fumadocsMdx).toHaveBeenCalledExactlyOnceWith({ configPath: "./src/integrations/fumadocs/fumadocs.config.ts" })
  expect(bundled.config()).toStrictEqual({ resolve: { noExternal: ["fumadocs-core", "@fumadocs/base-ui"] } })
  expect(bundled.name).toBe("saasyland:fumadocs-bundled")
})
