import { createElement } from "react"

import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { createTranslator } from "use-intl"
import { v7 } from "uuid"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import {
  NEWSLETTER_SOURCE,
  NEWSLETTER_STATUS,
  NEWSLETTER_SUBSCRIBER_MUTATION_KEYS,
  SUBSCRIPTION_RESULT,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import { newsletterRequestOrigin } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.server"
import type { NewsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"
import { confirmationExpiry, confirmationUrl, createToken } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.utils"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"

import { withinRecipientRateLimit } from "~/src/lib/rate-limit"

import type confirmationMessages from "~/messages/en-US/emails.newsletter-confirmation-email.json"
import { NEWSLETTER_CONFIRMATION_NAMESPACE, NewsletterConfirmationEmail } from "~/src/presentation/emails/newsletter-confirmation-email"

const SINGLE_ROW = 1

export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .middleware([withRateLimit("subscribe-to-newsletter", RATE_LIMITS.SENSITIVE)])
  .validator((input: NewsletterSubscriber["subscribeToNewsletter"]) => newsletterSubscriberZodSchemas.subscribeToNewsletter.parse(input))
  .handler(async ({ data: { email, locale, source } }) => {
    const origin = newsletterRequestOrigin(getRequest())
    const address = email.toLowerCase()

    const [existing] = await db
      .select({ status: newsletterSubscriber.status })
      .from(newsletterSubscriber)
      .where(eq(newsletterSubscriber.email, address))
      .limit(SINGLE_ROW)

    if (existing?.status === NEWSLETTER_STATUS.SUBSCRIBED) {
      return { status: SUBSCRIPTION_RESULT.ALREADY_SUBSCRIBED }
    }

    if (!(await withinRecipientRateLimit({ kind: EMAIL_PURPOSE.NEWSLETTER_CONFIRMATION, recipient: address }))) {
      console.warn("[newsletter] confirmation email not sent: the recipient reached the hourly limit")
      return { status: SUBSCRIPTION_RESULT.CONFIRMATION_SENT }
    }

    const confirmationToken = createToken()

    await db
      .insert(newsletterSubscriber)
      .values({
        confirmationExpiresAt: confirmationExpiry(),
        confirmationToken,
        email: address,
        id: v7(),
        locale,
        source: source ?? NEWSLETTER_SOURCE.FOOTER,
        unsubscribeToken: createToken(),
      })
      .onConflictDoUpdate({
        set: { confirmationExpiresAt: confirmationExpiry(), confirmationToken, locale, status: NEWSLETTER_STATUS.PENDING },
        target: newsletterSubscriber.email,
      })

    const messages = await loadNamespace<typeof confirmationMessages>({ locale, namespace: NEWSLETTER_CONFIRMATION_NAMESPACE })

    await sendEmail({
      idempotency: { purpose: EMAIL_PURPOSE.NEWSLETTER_CONFIRMATION, token: confirmationToken },
      react: createElement(NewsletterConfirmationEmail, {
        confirmUrl: confirmationUrl({ locale, origin, token: confirmationToken }),
        locale,
        messages,
      }),
      subject: createTranslator({ locale, messages })("subject"),
      to: address,
    })

    return { status: SUBSCRIPTION_RESULT.CONFIRMATION_SENT }
  })

export const subscribeToNewsletterMutation = mutationOptions({
  mutationFn: (data: NewsletterSubscriber["subscribeToNewsletter"]) => subscribeToNewsletter({ data }),
  mutationKey: NEWSLETTER_SUBSCRIBER_MUTATION_KEYS.SUBSCRIBE,
})
