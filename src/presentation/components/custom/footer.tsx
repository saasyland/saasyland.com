import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { useSiteNavigation } from "~/src/hooks/use-site-navigation"

import { FOOTER_SECTIONS } from "~/src/data/marketing"
import { FOOTER_COLUMN } from "~/src/data/navigation.constants"
import { NEWSLETTER_SENDING } from "~/src/data/newsletter"

import { cn } from "~/src/lib/cn"
import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"

import { LocaleSwitcher } from "~/src/presentation/components/custom/locale-switcher"
import { NewsletterForm } from "~/src/presentation/components/custom/newsletter-form"
import { SiteEntryLabel } from "~/src/presentation/components/custom/site-entry-label"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { APP_FOUNDED_YEAR, APP_GITHUB_URL, APP_INSTAGRAM_URL, APP_NAME, CONTACT_EMAIL } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

const LINK_CLASSNAME =
  "inline-block rounded-sm py-1.5 text-body-sm text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const HEADING_CLASSNAME = "text-label text-muted-foreground uppercase"

const PROFILE_LINKS = [
  { href: APP_GITHUB_URL, key: "github" },
  { href: APP_INSTAGRAM_URL, key: "instagram" },
] as const

export const Footer = (): JSX.Element => {
  const t = useTranslations()
  const { footer } = useSiteNavigation()

  const years = [...new Set([APP_FOUNDED_YEAR, REPOSITORY_FACTS.buildYear])].join("–")

  return (
    <footer className="relative z-10 border-t border-border bg-background">
      <div className="mx-auto w-full max-w-site px-6 md:px-10">
        <div className="grid gap-x-16 gap-y-8 border-b border-border py-14 md:grid-cols-2 md:items-end md:py-16">
          <div>
            <h2 className="text-headline-support text-foreground">{t("components.custom.footer.buildLog.title")}</h2>
            <p className="mt-3 max-w-136 text-body text-pretty text-muted-foreground">
              {t("components.custom.footer.buildLog.body", { sending: NEWSLETTER_SENDING })}
            </p>
          </div>
          <NewsletterForm />
        </div>

        <div className="flex flex-wrap items-start gap-x-8 gap-y-12 py-14 md:gap-x-12 md:py-16">
          <div className="basis-full md:flex-[1.5]">
            <Wordmark />
            <p className="mt-4 max-w-[24rem] text-body text-pretty text-muted-foreground">{t("components.custom.footer.tagline")}</p>
            <a
              className="mt-4.5 inline-block rounded-sm py-1.5 text-spec text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
          </div>

          {footer.map((column) => (
            <div className={cn("flex-1", { "md:flex-[1.3]": column.key === FOOTER_COLUMN.PRODUCT })} key={column.key}>
              <h3 className={HEADING_CLASSNAME}>{t(`components.custom.footer.columns.${column.key}`)}</h3>
              <ul className={cn("mt-4", { "md:grid md:grid-cols-[1fr_1fr] md:gap-x-8": column.key === FOOTER_COLUMN.PRODUCT })}>
                {column.key === FOOTER_COLUMN.PRODUCT &&
                  FOOTER_SECTIONS.map((section) => (
                    <li key={section}>
                      <Link activeOptions={{ includeHash: true }} className={LINK_CLASSNAME} hash={section} to={ROUTES.HOME}>
                        {t(`components.custom.footer.links.${section}`)}
                      </Link>
                    </li>
                  ))}
                {column.links.map((link, position) => (
                  <li key={position}>
                    <Link className={LINK_CLASSNAME} to={link.to}>
                      <SiteEntryLabel entry={link} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-border py-7">
          <p className="text-spec text-muted-foreground">
            <span>{APP_NAME}</span>
            <span className="ml-2">{t("components.custom.footer.copyright", { years })}</span>
            <span className="ml-2">{t("components.custom.footer.rights")}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {PROFILE_LINKS.map((link) => (
              <a
                className="rounded-sm py-1.5 text-body-sm text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                href={link.href}
                key={link.key}
                rel="noreferrer"
                target="_blank"
              >
                {t(`components.custom.footer.links.${link.key}`)}
              </a>
            ))}
            <span aria-hidden className="h-4 w-px bg-border" />
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </footer>
  )
}
