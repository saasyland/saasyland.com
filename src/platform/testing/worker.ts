import { TEST_WORKER_KIND, type TestWorkerEntry } from "~/e2e/data/worker"
import * as AREA_TEST_WORKER from "~/e2e/data/worker.entries"
import type * as applicationModuleType from "~/src/server"

const ENTRIES: readonly TestWorkerEntry[] = Object.values(AREA_TEST_WORKER).flat()

let installation: Promise<void> | null = null
let applicationModule: Promise<typeof applicationModuleType> | null = null

const installProviderDoubles = async (): Promise<void> => {
  const providers = await import("~/src/platform/testing/mocks/providers")
  for (const entry of ENTRIES) {
    if (entry.kind === TEST_WORKER_KIND.SETUP) {
      await entry.setup()
    }
  }
  const nativeFetch = globalThis.fetch
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const request = new Request(input, init)
      if (!providers.servesProvider(request)) {
        return nativeFetch(request)
      }
      const response = await providers.fetchFromProviders(request)
      for (const refusal of providers.takeProviderRefusals()) {
        console.error(`[provider double] refused ${refusal}`)
      }
      return response
    },
    { preconnect: nativeFetch.preconnect },
  )
}

export default {
  async fetch(request, env) {
    installation ??= installProviderDoubles()
    await installation

    const url = new URL(request.url)
    if (request.method === "GET") {
      for (const entry of ENTRIES) {
        if (entry.kind === TEST_WORKER_KIND.ENDPOINT && entry.path === url.pathname) {
          return entry.respond(url, env)
        }
      }
    }

    applicationModule ??= import("~/src/server")
    const { default: application } = await applicationModule
    return application.fetch(request, env)
  },
} satisfies ExportedHandler<Cloudflare.Env>
