import { expect, it } from "vite-plus/test"

import { POLAR_VITE_PLUGINS } from "~/src/integrations/polar/polar.vite"

const [optionalPeers] = POLAR_VITE_PLUGINS

it("leaves the Polar SDK's uninstalled optional peers out of the bundle", async () => {
  const plugins = await optionalPeers.plugins()

  expect(plugins.map((plugin) => plugin.config())).toStrictEqual([
    { build: { rolldownOptions: { external: [/^@opentelemetry\//u, "ioredis"] } } },
  ])
  expect(optionalPeers.vitest).toBe(false)
})
