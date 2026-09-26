import type { JSX } from "react"

import { ArrowRight, ArrowUpRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { cn } from "~/src/lib/cn"

import { HighlightGroup, HighlightItem } from "~/src/presentation/components/custom/highlight"
import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

import { CONTACT_EMAIL } from "~/src/presentation/branding"

const GRID_DELAY_MS = 100

const FEATURE_HREF = `mailto:${CONTACT_EMAIL}?subject=Built%20on%20SaaSy%20Land`

const CASES = [
  { href: "https://reactprojects.com", id: "reactprojects", isLive: true },
  { href: undefined, id: "marte", isLive: false },
] as const

const CaseName = ({ children, href }: Readonly<{ children: string; href: string | undefined }>): JSX.Element | string => {
  if (href === undefined) {
    return children
  }

  return (
    <a
      className="inline-flex items-center gap-1.5 after:absolute after:inset-0 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
      <ArrowUpRight
        aria-hidden
        className="size-4 text-muted-foreground transition-transform duration-200 ease-exp group-hover:-translate-y-0.5"
        strokeWidth={2}
      />
    </a>
  )
}

export const CasesSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.cases")

  return (
    <section className="relative border-t border-border">
      <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <Reveal variant="heading">
          <h2 className="max-w-[18ch] text-headline-peak text-balance text-foreground">{t("title")}</h2>
          <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{t("description")}</p>
        </Reveal>

        <Reveal className="mt-14 md:mt-20" delay={GRID_DELAY_MS}>
          <HighlightGroup className="grid gap-px border-y border-border bg-border md:grid-cols-2" name="cases-highlight">
            {CASES.map(({ href, id, isLive }) => (
              <HighlightItem
                className="group bg-background"
                contentClassName="flex h-full flex-col px-6 py-8 md:px-8 md:py-10"
                id={id}
                key={id}
              >
                <p className="flex items-center gap-2.5 font-mono text-label text-muted-foreground uppercase">
                  <span
                    aria-hidden
                    className={cn("size-1.25 shrink-0 rounded-xs", { "bg-muted-foreground/40": !isLive, "bg-ring": isLive })}
                  />
                  {isLive ? t("statusLive") : t("statusSoon")}
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  {t(`items.${id}.kind`)}
                </p>

                <h3 className="mt-5 text-title text-foreground">
                  <CaseName href={href}>{t(`items.${id}.name`)}</CaseName>
                </h3>

                <p className="mt-3 max-w-[54ch] text-body-sm text-pretty text-muted-foreground">{t(`items.${id}.body`)}</p>

                <div className="mt-auto pt-8">
                  <p className="font-mono text-label text-muted-foreground/70 uppercase">{t("modulesLabel")}</p>
                  <p className="mt-2 font-mono text-spec text-pretty text-muted-foreground">{t(`items.${id}.modules`)}</p>
                </div>
              </HighlightItem>
            ))}
          </HighlightGroup>

          <div className="mt-10 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <p className="text-body-sm text-muted-foreground">{t("invite")}</p>
            <a
              className="group inline-flex items-center gap-2 rounded-sm text-body-sm font-medium text-foreground transition-colors duration-200 ease-exp hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              href={FEATURE_HREF}
            >
              {t("inviteCta")}
              <ArrowRight
                aria-hidden
                className="size-3.5 transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
                strokeWidth={2}
              />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
