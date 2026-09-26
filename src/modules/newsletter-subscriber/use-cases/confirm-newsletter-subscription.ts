import { createElement } from "react"

import { createServerFn } from "@tanstack/react-start"
import { and, eq, gt, sql } from "drizzle-orm"
import { createTranslator } from "use-intl"
import type * as zod from "zod"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"

import type notificationMessages from "~/messages/en-US/emails.newsletter-notification-email.json"
import { CONTACT_EMAIL, NOTIFICATIONS_EMAIL } from "~/src/presentation/branding"
import { NEWSLETTER_NOTIFICATION_NAMESPACE, NewsletterNotificationEmail } from "~/src/presentation/emails/newsletter-notification-email"

export const confirmNewsletterSubscription = createServerFn({ method: "POST" })
  .middleware([withRateLimit("confirm-newsletter-subscription", RATE_LIMITS.TOKEN)])
  .validator((input: zod.input<typeof newsletterSubscriberZodSchemas.confirmNewsletterSubscription>) =>
    newsletterSubscriberZodSchemas.confirmNewsletterSubscription.parse(input),
  )
  .handler(async ({ data: { token } }) => {
    const now = new Date()

    const [confirmed] = await db
      .update(newsletterSubscriber)
      .set({
        confirmationExpiresAt: sql`null`,
        confirmationToken: sql`null`,
        status: "subscribed",
        subscribedAt: now,
        unsubscribedAt: sql`null`,
      })
      .where(and(eq(newsletterSubscriber.confirmationToken, token), gt(newsletterSubscriber.confirmationExpiresAt, now)))
      .returning({ email: newsletterSubscriber.email, locale: newsletterSubscriber.locale })

    if (!confirmed) {
      return { confirmed: false }
    }

    try {
      const messages = await loadNamespace<typeof notificationMessages>({
        locale: I18N.DEFAULT_LOCALE,
        namespace: NEWSLETTER_NOTIFICATION_NAMESPACE,
      })

      await sendEmail({
        from: NOTIFICATIONS_EMAIL,
        idempotencyKey: `newsletter-notification/${token}`,
        react: createElement(NewsletterNotificationEmail, { email: confirmed.email, locale: confirmed.locale, messages }),
        subject: createTranslator({ locale: I18N.DEFAULT_LOCALE, messages })("subject"),
        to: CONTACT_EMAIL,
      })
    } catch (error) {
      console.error(`[newsletter] owner notification failed for ${confirmed.email}`, error)
    }

    return { confirmed: true }
  })
