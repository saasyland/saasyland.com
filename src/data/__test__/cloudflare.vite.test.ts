import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { CLOUDFLARE_VITE_PLUGINS } from "~/src/data/cloudflare.vite"

const cloudflare = vi.hoisted(() => vi.fn(() => [{ name: "cloudflare" }]))

vi.mock(import("@cloudflare/vite-plugin"), () => ({ cloudflare }))

const [worker, deployedWorker] = CLOUDFLARE_VITE_PLUGINS

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("Cloudflare Vite plugins", () => {
  it("runs the test build on its own local state and no remote binding", async () => {
    vi.stubEnv("CLOUDFLARE_ENV", ENVIRONMENT.TEST)

    expect(await worker.plugins(ENVIRONMENT.TEST)).toStrictEqual([[{ name: "cloudflare" }]])
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
      vi.stubEnv("CLOUDFLARE_ENV", environment)

      await worker.plugins(environment)

      expect(cloudflare).toHaveBeenLastCalledWith(expect.objectContaining({ persistState: true, remoteBindings: false }))
    },
  )

  it("builds the deployed Worker after prerendering, and neither plugin runs under Vitest", async () => {
    const [plugin] = await deployedWorker.plugins()

    expect(plugin?.name).toBe("saasyland:deployed-worker")
    expect(CLOUDFLARE_VITE_PLUGINS.map(({ vitest }) => vitest)).toStrictEqual([false, false])
    expect(deployedWorker.order).toBeGreaterThan(worker.order)
  })
})
