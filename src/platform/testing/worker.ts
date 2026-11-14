import type * as resendModuleType from "~/src/platform/testing/mocks/resend"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { TEST_LICENSED_ACCOUNT } from "~/e2e/data/accounts"
import { TEST_LICENSE } from "~/e2e/data/licenses"
import type * as applicationModuleType from "~/src/server"

let resendModule: Promise<typeof resendModuleType> | null = null
let applicationModule: Promise<typeof applicationModuleType> | null = null

const installProviderDoubles = async (): Promise<typeof resendModuleType> => {
  const [providers, resend, polar] = await Promise.all([
    import("~/src/platform/testing/mocks/providers"),
    import("~/src/platform/testing/mocks/resend"),
    import("~/src/platform/testing/mocks/polar"),
  ])
  polar.seedPolarLicenseKey({
    activation: TEST_LICENSE.activation,
    externalCustomerId: TEST_LICENSED_ACCOUNT.id,
    key: TEST_LICENSE.key,
    licenseKeyId: TEST_LICENSE.polarLicenseKeyId,
    tier: TEST_LICENSE.tier,
  })
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
  return resend
}

export default {
  async fetch(request, env) {
    resendModule ??= installProviderDoubles()
    const { getSentEmails } = await resendModule

    const url = new URL(request.url)
    if (url.pathname === "/__test/emails" && request.method === "GET") {
      const recipient = url.searchParams.get("to")
      if (recipient === null || recipient.length === 0) {
        return Response.json({ error: "An email recipient is required" }, { status: HTTP_STATUS.BAD_REQUEST })
      }
      return Response.json(getSentEmails(recipient))
    }
    if (url.pathname === "/__test/newsletter" && request.method === "GET") {
      const email = url.searchParams.get("email")
      if (email === null || !email.endsWith("@example.test")) {
        return Response.json({ error: "A test email address is required" }, { status: HTTP_STATUS.BAD_REQUEST })
      }
      const subscriber = await env.DB.prepare(
        "SELECT status, unsubscribe_token AS unsubscribeToken, unsubscribed_at AS unsubscribedAt FROM newsletter_subscriber WHERE email = ?",
      )
        .bind(email)
        .first()
      return Response.json(subscriber)
    }

    applicationModule ??= import("~/src/server")
    const { default: application } = await applicationModule
    return application.fetch(request, env)
  },
} satisfies ExportedHandler<Cloudflare.Env>
