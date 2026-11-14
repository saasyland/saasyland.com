import { describe, expect, it, vi } from "vite-plus/test"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

const pluginsFor = vi.hoisted(
  () =>
    (name: string) =>
    (mode: string): Promise<{ name: string }[]> =>
      Promise.resolve([{ name: `${name}:${mode}` }]),
)

vi.mock("~/src/data/vite.entries", () => ({
  FIRST_VITE_PLUGINS: [
    { order: 30, plugins: pluginsFor("third"), vitest: false },
    { order: 10, plugins: pluginsFor("first"), vitest: true },
  ],
  SECOND_VITE_PLUGINS: [{ order: 20, plugins: pluginsFor("second"), vitest: false }],
}))

describe("Vite plugin composition", () => {
  it("builds the plugins of every area in their declared order for the build's mode", async () => {
    const { vitePlugins } = await import("~/src/data/vite")

    expect(await vitePlugins({ mode: ENVIRONMENT.PREVIEW, vitest: false })).toStrictEqual([
      { name: `first:${ENVIRONMENT.PREVIEW}` },
      { name: `second:${ENVIRONMENT.PREVIEW}` },
      { name: `third:${ENVIRONMENT.PREVIEW}` },
    ])
  })

  it("loads only the plugins an area marks for Vitest when the tests run", async () => {
    const { vitePlugins } = await import("~/src/data/vite")

    expect(await vitePlugins({ mode: ENVIRONMENT.TEST, vitest: true })).toStrictEqual([{ name: `first:${ENVIRONMENT.TEST}` }])
  })
})
