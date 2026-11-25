import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import {
  listNewsletterSubscribersPageQuery,
  listNewsletterSubscribersQuery,
} from "~/src/modules/newsletter-subscriber/use-cases/list-newsletter-subscribers"

import { pageHead } from "~/src/lib/seo"

import { AdminNewsletterSubscribersPending } from "~/src/presentation/components/custom/admin/newsletter-pending"
import {
  NEWSLETTER_SUBSCRIBER_GRID_ID,
  useNewsletterSubscriberColumns,
} from "~/src/presentation/components/custom/admin/newsletter/newsletter-subscriber-columns"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

import * as ROUTES from "~/src/routes"

const NewsletterSubscribersPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.newsletter.subscribers")
  const columns = useNewsletterSubscriberColumns()

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <DataGrid
        columns={columns}
        empty={t("empty")}
        emptyDescription={t("emptyDescription")}
        id={NEWSLETTER_SUBSCRIBER_GRID_ID}
        label={t("title")}
        query={(request) => listNewsletterSubscribersPageQuery(newsletterSubscriberZodSchemas.listNewsletterSubscribers.parse(request))}
        search={t("search")}
        selectable
      />
    </div>
  )
}

const NAMESPACE = "pages.admin.newsletter"

export const Route = createFileRoute("/admin/newsletter/")({
  component: NewsletterSubscribersPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...listNewsletterSubscribersQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.ADMIN_NEWSLETTER),
  pendingComponent: AdminNewsletterSubscribersPending,
  staticData: { namespaces: [NAMESPACE] },
})
