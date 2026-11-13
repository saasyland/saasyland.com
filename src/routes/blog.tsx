import type { JSX } from "react"

import { Link, Outlet, createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { cn } from "~/src/lib/cn"

import { BackToTop } from "~/src/presentation/components/custom/back-to-top"
import { BlogPending } from "~/src/presentation/components/custom/blog/blog-pending"
import { Footer } from "~/src/presentation/components/custom/footer"
import { HomeLink } from "~/src/presentation/components/custom/home-link"
import { PageFrame } from "~/src/presentation/components/custom/page-frame"

import docsCss from "~/src/presentation/styles/docs.css?url"

import { ROUTES } from "~/src/routes"

const NAV_LINK_CLASSNAME =
  "rounded-md text-body-sm transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"

const BlogLayout = (): JSX.Element => {
  const t = useTranslations("pages.blog")

  return (
    <div className="dark relative isolate min-h-svh bg-background text-foreground">
      <PageFrame />
      <header className="relative z-50 border-b border-border">
        <nav
          aria-label={t("metadata.title")}
          className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-6 md:px-10"
        >
          <HomeLink />

          <div className="flex items-center gap-5 lg:gap-7">
            <Link className={cn(NAV_LINK_CLASSNAME, "text-muted-foreground")} to={ROUTES.DOCS}>
              {t("nav.docs")}
            </Link>
            <Link aria-current="page" className={cn(NAV_LINK_CLASSNAME, "text-foreground")} to={ROUTES.BLOG}>
              {t("nav.blog")}
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-body-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-200 ease-exp hover:bg-primary/88 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px"
              hash={MARKETING_SECTION_IDS.PRICING}
              to={ROUTES.HOME}
            >
              {t("nav.getStarted")}
            </Link>
          </div>
        </nav>
      </header>
      <main className="relative z-10">
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}

const NAMESPACES = ["auth.validations", "pages.blog"] as const

export const Route = createFileRoute("/blog")({
  component: BlogLayout,
  head: () => ({ links: [{ href: docsCss, rel: "stylesheet" }] }),
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: BlogPending,
  staticData: { namespaces: NAMESPACES },
})
