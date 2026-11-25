import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { type SQL, and, asc, count, desc } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { anyTranslationContains, oneOf, withinDates } from "~/src/integrations/drizzle-orm/drizzle.search"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { NEWSLETTER_ISSUE_QUERY_KEYS } from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import { newsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.schema"
import type { NewsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.types"
import { issueContent, issueLocale } from "~/src/modules/newsletter-issue/newsletter-issue.utils"
import { newsletterIssueZodSchemas } from "~/src/modules/newsletter-issue/newsletter-issue.zod"

const sortColumns = {
  createdAt: newsletterIssue.createdAt,
  sentAt: newsletterIssue.sentAt,
  sentCount: newsletterIssue.sentCount,
  status: newsletterIssue.status,
}

const searched = (search: string): SQL[] => (search.length === 0 ? [] : [anyTranslationContains(newsletterIssue.subject, search)])

const matching = (search: string, { createdAt, status }: NewsletterIssue["issueFilters"]): SQL | undefined =>
  and(...searched(search), ...withinDates(newsletterIssue.createdAt, createdAt), ...oneOf(newsletterIssue.status, status))

export const getNewsletterIssues = createServerFn({ method: "GET" })
  .middleware([authorized({ admin: ["access"] })])
  .validator((input: NewsletterIssue["getNewsletterIssues"]) => newsletterIssueZodSchemas.getNewsletterIssues.parse(input))
  .handler(async ({ data }) => {
    const where = matching(data.search, data.filters)
    const [rows, totals] = await db.batch([
      db
        .select({
          body: newsletterIssue.body,
          createdAt: newsletterIssue.createdAt,
          id: newsletterIssue.id,
          recipientCount: newsletterIssue.recipientCount,
          sentAt: newsletterIssue.sentAt,
          sentCount: newsletterIssue.sentCount,
          status: newsletterIssue.status,
          subject: newsletterIssue.subject,
        })
        .from(newsletterIssue)
        .where(where)
        .orderBy(...data.sorting.map((sort) => (sort.desc ? desc : asc)(sortColumns[sort.id])), desc(newsletterIssue.createdAt))
        .limit(data.pageSize)
        .offset(data.pageIndex * data.pageSize),
      db.select({ total: count() }).from(newsletterIssue).where(where),
    ])

    return {
      rows: rows.map(({ body, createdAt, id, recipientCount, sentAt, sentCount, status, subject }) => ({
        createdAt,
        id,
        locales: I18N.SUPPORTED_LOCALES.filter((locale) => issueLocale({ body, subject }, locale) === locale),
        recipientCount,
        sentAt,
        sentCount,
        status,
        subject: issueContent({ body, subject }, I18N.DEFAULT_LOCALE).subject,
      })),
      total: totals.reduce((sum, { total }) => sum + total, 0),
    }
  })

export const getNewsletterIssuesPageQuery = (input: NewsletterIssue["getNewsletterIssues"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getNewsletterIssues>>>({
    queryFn: () => getNewsletterIssues({ data: input }),
    queryKey: [...NEWSLETTER_ISSUE_QUERY_KEYS.LIST, newsletterIssueZodSchemas.getNewsletterIssues.parse(input)],
  })

export const getNewsletterIssuesQuery = getNewsletterIssuesPageQuery()
