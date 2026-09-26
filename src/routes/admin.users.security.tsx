import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { AdminUsersSecurityPending } from "~/src/presentation/components/custom/admin/administration-pending"

import { ROUTES } from "~/src/routes"

const UsersSecurityPage = (): JSX.Element => {
  const t = useTranslations("common")

  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">{t("noDataToDisplay")}</p>
    </div>
  )
}

const NAMESPACE = "pages.admin.users"

export const Route = createFileRoute("/admin/users/security")({
  component: UsersSecurityPage,
  head: pageHead(ROUTES.ADMIN_USERS_SECURITY),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminUsersSecurityPending,
  staticData: { namespaces: [NAMESPACE] },
})
