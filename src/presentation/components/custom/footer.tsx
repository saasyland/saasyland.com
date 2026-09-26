import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { LocaleSwitcher } from "~/src/presentation/components/custom/locale-switcher"
import { NewsletterForm } from "~/src/presentation/components/custom/newsletter-form"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { APP_FOUNDED_YEAR, APP_GITHUB_URL, APP_NAME, CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const LINK_CLASSNAME =
  "inline-block rounded-sm py-1.5 text-body-sm text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const HEADING_CLASSNAME = "font-mono text-label text-muted-foreground uppercase"

const SECTION_LINKS = [MARKETING_SECTION_IDS.FOUNDATION, MARKETING_SECTION_IDS.PRICING, MARKETING_SECTION_IDS.FAQ] as const

const PAGE_LINKS = [
  { key: "docs", to: ROUTES.DOCS },
  { key: "blog", to: ROUTES.BLOG },
  { key: "signIn", to: ROUTES.SIGN_IN },
] as const

const LEGAL_LINKS = [
  { key: "privacy", to: ROUTES.PRIVACY },
  { key: "terms", to: ROUTES.TERMS },
  { key: "refunds", to: ROUTES.REFUNDS },
  { key: "licence", to: ROUTES.LICENCE },
] as const

export const Footer = (): JSX.Element => {
  const t = useTranslations("components.custom.footer")

  const currentYear = new Date().getFullYear()
  const years = currentYear > APP_FOUNDED_YEAR ? `${APP_FOUNDED_YEAR}–${currentYear}` : String(APP_FOUNDED_YEAR)

  return (
    <footer className="relative z-10 border-t border-border bg-background">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-10">
        <div className="grid gap-x-16 gap-y-8 border-b border-border py-14 md:grid-cols-2 md:items-end md:py-16">
          <div>
            <h2 className="text-headline-support text-foreground">{t("buildLog.title")}</h2>
            <p className="mt-3 max-w-136 text-body text-pretty text-muted-foreground">{t("buildLog.body")}</p>
          </div>
          <NewsletterForm />
        </div>

        <div className="grid grid-cols-2 items-start gap-x-8 gap-y-12 py-14 md:grid-cols-[1.5fr_1.3fr_1fr] md:gap-x-12 md:py-16">
          <div className="col-span-2 md:col-span-1">
            <Wordmark />
            <p className="mt-4 max-w-[24rem] text-body text-pretty text-muted-foreground">{t("tagline")}</p>
            <a
              className="mt-6 inline-block rounded-sm font-mono text-spec text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
          </div>

          <div>
            <h3 className={HEADING_CLASSNAME}>{t("product")}</h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-8">
              {SECTION_LINKS.map((section) => (
                <li key={section}>
                  <Link className={LINK_CLASSNAME} hash={section} to={ROUTES.HOME}>
                    {t(`links.${section}`)}
                  </Link>
                </li>
              ))}
              {PAGE_LINKS.map((link) => (
                <li key={link.key}>
                  <Link className={LINK_CLASSNAME} to={link.to}>
                    {t(`links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={HEADING_CLASSNAME}>{t("legal")}</h3>
            <ul className="mt-4">
              {LEGAL_LINKS.map((link) => (
                <li key={link.key}>
                  <Link className={LINK_CLASSNAME} to={link.to}>
                    {t(`links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-border py-7">
          <p className="font-mono text-spec text-muted-foreground">
            <span>{APP_NAME}</span>
            <span className="ml-2">{t("copyright", { years })}</span>
            <span className="ml-2">{t("rights")}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              className="rounded-sm py-1.5 text-body-sm text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href={APP_GITHUB_URL}
              rel="noreferrer"
              target="_blank"
            >
              {t("links.github")}
            </a>
            <span aria-hidden className="h-4 w-px bg-border" />
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </footer>
  )
}
