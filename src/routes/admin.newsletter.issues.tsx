import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { newsletterIssueZodSchemas } from "~/src/modules/newsletter-issue/newsletter-issue.zod"
import { getNewsletterIssuesPageQuery, getNewsletterIssuesQuery } from "~/src/modules/newsletter-issue/use-cases/get-newsletter-issues"

import { pageHead } from "~/src/lib/seo"

import { AdminNewsletterIssuesPending } from "~/src/presentation/components/custom/admin/newsletter-pending"
import { NewsletterIssueActions } from "~/src/presentation/components/custom/admin/newsletter/newsletter-issue-actions"
import {
  NEWSLETTER_ISSUE_GRID_ID,
  useNewsletterIssueColumns,
} from "~/src/presentation/components/custom/admin/newsletter/newsletter-issue-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

import { ROUTES } from "~/src/routes"

const NewsletterIssuesPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.newsletter.issues")
  const columns = useNewsletterIssueColumns()

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <DataGrid
        columns={columns}
        empty={t("empty")}
        emptyDescription={t("emptyDescription")}
        id={NEWSLETTER_ISSUE_GRID_ID}
        label={t("title")}
        query={(request) => getNewsletterIssuesPageQuery(newsletterIssueZodSchemas.getNewsletterIssues.parse(request))}
        rowActions={NewsletterIssueActions}
        search={t("search")}
      />
    </div>
  )
}

const NAMESPACE = "pages.admin.newsletter"

export const Route = createFileRoute("/admin/newsletter/issues")({
  component: NewsletterIssuesPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getNewsletterIssuesQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.ADMIN.NEWSLETTER.ISSUES),
  pendingComponent: AdminNewsletterIssuesPending,
  staticData: { namespaces: [NAMESPACE] },
})
