import type { JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { BackToTop } from "~/src/presentation/components/custom/back-to-top"
import { BlogPending } from "~/src/presentation/components/custom/blog/blog-pending"
import { ContentNavigation } from "~/src/presentation/components/custom/content-navigation"
import { Footer } from "~/src/presentation/components/custom/footer"
import { PageFrame } from "~/src/presentation/components/custom/page-frame"

import docsCss from "~/src/presentation/styles/docs.css?url"

const BlogLayout = (): JSX.Element => (
  <div className="dark relative isolate min-h-svh bg-background text-foreground">
    <PageFrame />
    <ContentNavigation />
    <main className="relative z-10">
      <Outlet />
    </main>
    <Footer />
    <BackToTop />
  </div>
)

const NAMESPACES = ["auth.validations", "pages.blog"] as const

export const Route = createFileRoute("/blog")({
  component: BlogLayout,
  head: () => ({ links: [{ href: docsCss, rel: "stylesheet" }] }),
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: BlogPending,
  staticData: { namespaces: NAMESPACES },
})
