import type { JSX } from "react"

import { ArrowRight, ArrowUpRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { COURSE_PLATFORM_VALUES, PRODUCT_CASES, PRODUCT_CASE_STATUS } from "~/src/data/marketing"

import { cn } from "~/src/lib/cn"

import { HighlightGroup, HighlightItem } from "~/src/presentation/components/custom/highlight"
import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

import { CONTACT_EMAIL } from "~/src/presentation/branding"

const GRID_DELAY_MS = 100

const FEATURE_HREF = `mailto:${CONTACT_EMAIL}?subject=Built%20on%20SaaSy%20Land`

export const CasesSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.cases")

  return (
    <section className="relative border-t border-border">
      <div className="mx-auto w-full max-w-site px-6 py-24 md:px-10 md:py-32">
        <Reveal variant="heading">
          <h2 className="max-w-[18ch] text-headline-peak text-balance text-foreground">{t("title")}</h2>
          <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{t("description")}</p>
        </Reveal>

        <Reveal className="mt-14 md:mt-20" delay={GRID_DELAY_MS}>
          <HighlightGroup className="grid gap-px border-y border-border bg-border lg:grid-cols-3" name="cases-highlight">
            {PRODUCT_CASES.map((product) => (
              <HighlightItem
                className="group bg-background"
                contentClassName="flex h-full flex-col px-6 py-8 md:px-8 md:py-10"
                id={product.id}
                key={product.id}
              >
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-label text-muted-foreground uppercase">
                  <span
                    aria-hidden
                    className={cn("size-1.25 shrink-0 rounded-xs", {
                      "bg-muted-foreground/40": product.status === PRODUCT_CASE_STATUS.LAUNCH,
                      "bg-ring": product.status === PRODUCT_CASE_STATUS.WAITLIST,
                    })}
                  />
                  {t(`status.${product.status}`)}
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  {t(`items.${product.id}.kind`)}
                </p>

                <h3 className="mt-5 text-title text-foreground">
                  {product.status === PRODUCT_CASE_STATUS.WAITLIST && (
                    <a
                      className="inline-flex items-center gap-1.5 rounded-sm after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      href={product.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {product.name}
                      <ArrowUpRight
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-exp group-hover:translate-x-px group-hover:-translate-y-px motion-reduce:transition-none"
                        strokeWidth={1.5}
                      />
                    </a>
                  )}
                  {product.status === PRODUCT_CASE_STATUS.LAUNCH && product.name}
                </h3>

                <p className="mt-3 max-w-[54ch] text-body-sm text-pretty text-muted-foreground">
                  {t(`items.${product.id}.body`, COURSE_PLATFORM_VALUES)}
                </p>

                <div className="mt-auto pt-8">
                  <p className="font-mono text-label text-muted-foreground uppercase">{t("modulesLabel")}</p>
                  <p className="mt-2 font-mono text-spec text-pretty text-muted-foreground">{t(`items.${product.id}.modules`)}</p>
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
