import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"

import { pageHead } from "~/src/lib/seo"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminNewsletterComposePending } from "~/src/presentation/components/custom/admin/newsletter-pending"
import { NewsletterIssueForm } from "~/src/presentation/components/custom/admin/newsletter/newsletter-issue-form"

import { ROUTES } from "~/src/routes"

const NewsletterComposePage = (): JSX.Element => {
  const t = useTranslations("pages.admin.newsletter.compose")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <AdminPageHeader back={{ label: t("back"), to: ROUTES.ADMIN.NEWSLETTER.ISSUES }} description={t("description")} title={t("title")} />
      <NewsletterIssueForm />
    </div>
  )
}

const COMPOSE_NAMESPACE = "pages.admin.newsletter.compose"
const NAMESPACES = [COMPOSE_NAMESPACE, "pages.admin.newsletter", "newsletter-issue.validations"] as const

export const Route = createFileRoute("/admin/newsletter_/compose")({
  component: NewsletterComposePage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: COMPOSE_NAMESPACE }),
      preloadNamespaces({ locale, namespaces: NAMESPACES, queryClient: context.queryClient }),
      context.queryClient.query({ ...newsletterSubscribersQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.ADMIN.NEWSLETTER.COMPOSE),
  pendingComponent: AdminNewsletterComposePending,
  staticData: { namespaces: NAMESPACES },
})
