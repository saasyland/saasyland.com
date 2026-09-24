import type { JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { requireAdmin } from "~/src/integrations/better-auth/auth.routes"
import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { SidebarInset, SidebarProvider } from "~/src/presentation/components/shadcn/sidebar"

import { AdminLayoutHeader } from "~/src/presentation/components/custom/admin/components/admin-layout-header"
import { AdminSidebar } from "~/src/presentation/components/custom/admin/components/admin-sidebar"
import { UserWidget } from "~/src/presentation/components/custom/admin/components/user-widget"
import { Background } from "~/src/presentation/components/custom/background"

const AdminLayout = (): JSX.Element => (
  <SidebarProvider className="h-svh overflow-hidden">
    <AdminSidebar>
      <UserWidget />
    </AdminSidebar>

    <SidebarInset className="relative min-h-0 overflow-hidden">
      <Background className="z-[-1]" glow={false} />
      <AdminLayoutHeader />
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-5 pb-6 md:px-6 md:pt-7 md:pb-8">
        <Outlet />
      </div>
    </SidebarInset>
  </SidebarProvider>
)

export const Route = createFileRoute("/admin")({
  beforeLoad: requireAdmin,
  component: AdminLayout,
  loader: ({ context }) =>
    preloadNamespaces({
      locale: getCurrentLocale(),
      namespaces: ["auth.errors", "auth.validations", "pages.admin", "pages.admin.sidebar", "user.validations"],
      queryClient: context.queryClient,
    }),
  staticData: { namespaces: ["auth.errors", "auth.validations", "pages.admin", "pages.admin.sidebar", "user.validations"] },
})
