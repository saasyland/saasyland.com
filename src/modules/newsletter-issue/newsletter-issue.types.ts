import type * as zod from "zod"

import type { newsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.schema"
import type { newsletterIssueZodSchemas } from "~/src/modules/newsletter-issue/newsletter-issue.zod"
import type { getNewsletterIssues } from "~/src/modules/newsletter-issue/use-cases/get-newsletter-issues"
import type { sendNewsletterIssue } from "~/src/modules/newsletter-issue/use-cases/send-newsletter-issue"

export interface NewsletterIssue {
  select: typeof newsletterIssue.$inferSelect
  insert: typeof newsletterIssue.$inferInsert
  listRow: Awaited<ReturnType<typeof getNewsletterIssues>>["rows"][number]
  progress: Awaited<ReturnType<typeof sendNewsletterIssue>>
  issueFilters: zod.output<typeof newsletterIssueZodSchemas.getNewsletterIssues>["filters"]
  createNewsletterIssue: zod.input<typeof newsletterIssueZodSchemas.createNewsletterIssue>
  getNewsletterIssues: zod.input<typeof newsletterIssueZodSchemas.getNewsletterIssues>
  issueTexts: zod.input<typeof newsletterIssueZodSchemas.issueTexts>
  sendNewsletterIssue: zod.input<typeof newsletterIssueZodSchemas.sendNewsletterIssue>
}
