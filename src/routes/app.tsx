import type { JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { requireSignedIn } from "~/src/integrations/better-auth/auth.routes"
import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { SidebarInset, SidebarProvider } from "~/src/presentation/components/shadcn/sidebar"

import { AppPending } from "~/src/presentation/components/custom/app/app-pending"
import { EmailVerificationBanner } from "~/src/presentation/components/custom/app/email-verification-banner"
import { AppHeader } from "~/src/presentation/components/custom/app/header"
import { ImpersonationBanner } from "~/src/presentation/components/custom/app/impersonation-banner"
import { AppSidebar } from "~/src/presentation/components/custom/app/sidebar"
import { Background } from "~/src/presentation/components/custom/background"

const AppLayout = (): JSX.Element => (
  <SidebarProvider className="h-svh overflow-hidden">
    <AppSidebar />
    <SidebarInset className="relative min-h-0 min-w-0 overflow-hidden">
      <Background className="z-[-1]" glow={false} />
      <ImpersonationBanner />
      <AppHeader />
      <div
        className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-5 pb-6 md:px-6 md:pt-7 md:pb-8"
        data-page-scroller
      >
        <div className="mx-auto w-full max-w-5xl">
          <EmailVerificationBanner />
          <Outlet />
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
)

const NAMESPACES = [
  "auth.errors",
  "auth.form",
  "auth.security",
  "auth.validations",
  "countries",
  "pages.app.sidebar",
  "pages.license",
  "pages.withdrawal",
  "timezones",
  "withdrawal.validations",
] as const

export const Route = createFileRoute("/app")({
  beforeLoad: requireSignedIn,
  component: AppLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: AppPending,
  staticData: { namespaces: NAMESPACES },
})
