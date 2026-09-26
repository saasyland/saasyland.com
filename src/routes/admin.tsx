import type { JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { requireAdmin } from "~/src/integrations/better-auth/auth.routes"
import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/src/presentation/components/shadcn/sidebar"

import { AdminBreadcrumbs } from "~/src/presentation/components/custom/admin/admin-breadcrumbs"
import { AdminCommandPalette } from "~/src/presentation/components/custom/admin/admin-command-palette"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminSidebar } from "~/src/presentation/components/custom/admin/admin-sidebar"
import { Background } from "~/src/presentation/components/custom/background"

const AdminLayout = (): JSX.Element => (
  <SidebarProvider className="h-svh overflow-hidden">
    <AdminSidebar />

    <SidebarInset className="relative min-h-0 overflow-hidden">
      <Background className="z-[-1]" glow={false} />
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-xl md:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
          <AdminBreadcrumbs />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AdminCommandPalette />
        </div>
      </header>
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-5 pb-6 md:px-6 md:pt-7 md:pb-8">
        <Outlet />
      </div>
    </SidebarInset>
  </SidebarProvider>
)

const NAMESPACES = ["auth.errors", "auth.validations", "locales", "pages.admin", "pages.admin.sidebar", "timezones"] as const

export const Route = createFileRoute("/admin")({
  beforeLoad: requireAdmin,
  component: AdminLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: AdminPending,
  staticData: { namespaces: NAMESPACES },
})
