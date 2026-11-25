import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, count } from "drizzle-orm"

import { authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { issueAudience } from "~/src/modules/newsletter-issue/newsletter-issue.audience"
import { NEWSLETTER_ISSUE_MUTATION_KEYS, NEWSLETTER_ISSUE_RATE_LIMIT } from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import { newsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.schema"
import type { NewsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.types"
import { newsletterIssueZodSchemas } from "~/src/modules/newsletter-issue/newsletter-issue.zod"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"

export const createNewsletterIssue = createServerFn({ method: "POST" })
  .middleware([authorized({ admin: ["access"] }), withRateLimit("create-newsletter-issue", NEWSLETTER_ISSUE_RATE_LIMIT)])
  .validator((input: NewsletterIssue["createNewsletterIssue"]) => newsletterIssueZodSchemas.createNewsletterIssue.parse(input))
  .handler(async ({ data: { body, issueId, subject } }) => {
    const createdAt = new Date()
    const audience = await db
      .select({ total: count() })
      .from(newsletterSubscriber)
      .where(and(...issueAudience(createdAt)))
    const recipientCount = audience.reduce((sum, { total }) => sum + total, 0)

    await db
      .insert(newsletterIssue)
      .values({ body, createdAt, id: issueId, recipientCount, subject, updatedAt: createdAt })
      .onConflictDoNothing({ target: newsletterIssue.id })

    return { issueId }
  })

export const createNewsletterIssueMutation = mutationOptions({
  mutationFn: (data: NewsletterIssue["createNewsletterIssue"]) => createNewsletterIssue({ data }),
  mutationKey: NEWSLETTER_ISSUE_MUTATION_KEYS.CREATE,
})
