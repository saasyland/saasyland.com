import { expect, it } from "vite-plus/test"

import { polarVitePlugins } from "~/src/integrations/polar/polar.vite"

it("leaves the Polar SDK's uninstalled optional peers out of the bundle", async () => {
  const plugins = await polarVitePlugins()

  expect(plugins.map((plugin) => plugin.config())).toStrictEqual([
    { build: { rolldownOptions: { external: [/^@opentelemetry\//u, "ioredis"] } } },
  ])
  expect(plugins.map(({ name }) => name)).toStrictEqual(["saasyland:polar-sdk-optional-peers"])
})
