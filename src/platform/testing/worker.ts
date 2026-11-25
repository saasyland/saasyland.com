import { AUTH_TEST_WORKER } from "~/e2e/data/auth.worker"
import { BILLING_TEST_WORKER } from "~/e2e/data/billing.worker"
import { COURSES_TEST_WORKER } from "~/e2e/data/courses.worker"
import { LICENSE_TEST_WORKER } from "~/e2e/data/license.worker"
import { NEWSLETTER_TEST_WORKER } from "~/e2e/data/newsletter.worker"
import { PAYMENTS_TEST_WORKER } from "~/e2e/data/payments.worker"
import { PRODUCTS_TEST_WORKER } from "~/e2e/data/products.worker"
import { RESEND_TEST_WORKER } from "~/e2e/data/resend.worker"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "~/e2e/data/worker"
import type * as applicationModuleType from "~/src/server"

const ENTRIES: readonly TestWorkerEntry[] = [
  ...AUTH_TEST_WORKER,
  ...BILLING_TEST_WORKER,
  ...COURSES_TEST_WORKER,
  ...LICENSE_TEST_WORKER,
  ...NEWSLETTER_TEST_WORKER,
  ...PAYMENTS_TEST_WORKER,
  ...PRODUCTS_TEST_WORKER,
  ...RESEND_TEST_WORKER,
]

let installation: Promise<void> | null = null
let applicationModule: Promise<typeof applicationModuleType> | null = null

const installProviderDoubles = async (): Promise<void> => {
  const providers = await import("~/src/platform/testing/mocks/providers")
  providers.resetProviderDoubles()
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
