import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { describe, expect, it } from "vite-plus/test"

import { NEWSLETTER_SOURCES, NEWSLETTER_STATUSES } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"

describe("newsletter subscriber schema", () => {
  it("materializes through drizzle adapter", () => {
    expect.hasAssertions()
    expect(
      drizzleAdapter(
        {},
        {
          provider: "sqlite",
          schema: { newsletterSubscriber },
        },
      ),
    ).toBeDefined()
  })

  it("defines enums and updatedAt onUpdate", () => {
    expect.hasAssertions()
    expect(NEWSLETTER_STATUSES).toStrictEqual(["subscribed", "unsubscribed", "pending"])
    expect(NEWSLETTER_SOURCES).toStrictEqual(["footer", "blog", "app"])
    expect(newsletterSubscriber.locale.enumValues).toStrictEqual([
      "en-US",
      "de-DE",
      "es-ES",
      "fr-FR",
      "it-IT",
      "ja-JP",
      "pl-PL",
      "pt-BR",
      "uk-UA",
    ])
    const onUpdate = newsletterSubscriber.updatedAt.onUpdateFn
    expect(onUpdate).toBeDefined()
    expect(onUpdate?.()).toBeInstanceOf(Date)
  })
})
