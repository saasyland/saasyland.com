import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { PlusCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { ADMIN_ROLE_ROWS } from "~/src/data/admin"

import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AdminUsersRolesPending } from "~/src/presentation/components/custom/admin/administration-pending"
import { roleColumns } from "~/src/presentation/components/custom/admin/users/role-columns"
import { DataTable } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

const UsersRolesPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.users.roles")

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-statement font-semibold text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button size="sm" className="h-9 gap-2">
          <PlusCircle className="size-4" />
          {t("actions.createRole")}
        </Button>
      </div>

      <DataTable columns={roleColumns} data={ADMIN_ROLE_ROWS} />
    </div>
  )
}

const NAMESPACE = "pages.admin.users"

export const Route = createFileRoute("/admin/users/roles")({
  component: UsersRolesPage,
  head: pageHead(ROUTES.ADMIN_USERS_ROLES),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminUsersRolesPending,
  staticData: { namespaces: [NAMESPACE] },
})
