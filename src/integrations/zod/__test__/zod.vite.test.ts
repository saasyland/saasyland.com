import { expect, it } from "vite-plus/test"

import { zodConfigChunk, zodVitePlugins } from "~/src/integrations/zod/zod.vite"

it("puts the zod configuration in the browser's zod chunk, so jitless is set before any chunk builds a schema", async () => {
  expect(await zodVitePlugins()).toStrictEqual([{ configEnvironment: zodConfigChunk, name: "saasyland:zod-config-chunk" }])
  expect(zodConfigChunk("client")).toStrictEqual({
    build: {
      rolldownOptions: {
        output: { codeSplitting: { groups: [{ name: "zod", test: /[\\/]src[\\/]integrations[\\/]zod[\\/]zod\.config\.ts$/u }] } },
      },
    },
  })
  expect(zodConfigChunk("ssr")).toStrictEqual({})
})
