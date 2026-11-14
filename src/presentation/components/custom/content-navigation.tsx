import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"
import { NAVIGATION_PAGES } from "~/src/data/navigation"

import { HomeLink } from "~/src/presentation/components/custom/home-link"
import { MobileMenu } from "~/src/presentation/components/custom/mobile-menu"

import { ROUTES } from "~/src/routes"

export const ContentNavigation = (): JSX.Element => {
  const t = useTranslations("components.custom.navigation")

  return (
    <header className="relative z-50 border-b border-border">
      <nav aria-label={t("ariaLabel")} className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-6 md:px-10">
        <HomeLink />

        <div className="flex items-center gap-2 xl:gap-7">
          <div className="hidden items-center gap-7 xl:flex">
            {NAVIGATION_PAGES.map((page) => (
              <Link
                className="rounded-md text-body-sm text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring data-[status=active]:text-foreground"
                key={page.key}
                to={page.to}
              >
                {t(`items.${page.key}`)}
              </Link>
            ))}
          </div>
          <Link
            className="hidden h-9 items-center rounded-lg bg-primary px-4 text-body-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-200 ease-exp hover:bg-primary/88 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px sm:inline-flex"
            hash={MARKETING_SECTION_IDS.PRICING}
            to={ROUTES.HOME}
          >
            {t("getStarted")}
          </Link>
          <MobileMenu />
        </div>
      </nav>
    </header>
  )
}
