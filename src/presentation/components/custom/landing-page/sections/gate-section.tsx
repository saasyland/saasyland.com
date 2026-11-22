import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { CLI_GENERATION_VALUES } from "~/src/data/cli"
import { CTA_CLASSES } from "~/src/data/cta"
import { TIER_PRICES } from "~/src/data/marketing"
import { MARKETING_SECTION_IDS } from "~/src/data/navigation.constants"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"
import { Price } from "~/src/presentation/components/custom/price"

import { ROUTES } from "~/src/routes"

const DETAIL_DELAY_MS = 100
const TERMS_DELAY_MS = 200

const BADGES = ["projects", "license", "fees"] as const

export const GateSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.gate")

  return (
    <section className="relative overflow-hidden border-t border-border" id="gate">
      <div aria-hidden className="field-grid pointer-events-none absolute inset-0" />
      <div aria-hidden className="field-signal field-taper pointer-events-none absolute inset-0" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-28 text-center md:py-36">
        <Reveal variant="heading">
          <h2 className="text-display-gate text-balance text-foreground">{t("title", REPOSITORY_FACTS)}</h2>
          <p className="mx-auto mt-6 max-w-xl text-lead text-pretty text-muted-foreground">{t("description")}</p>
        </Reveal>

        <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-4" delay={DETAIL_DELAY_MS}>
          <a className={CTA_CLASSES.PRIMARY} href={`#${MARKETING_SECTION_IDS.PRICING}`}>
            {t("ctaPrimary")}
          </a>
          <Link className={CTA_CLASSES.SECONDARY} to={ROUTES.DOCS}>
            {t("ctaSecondary")}
            <ArrowRight
              aria-hidden
              className="size-3.5 text-muted-foreground transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
              strokeWidth={2}
            />
          </Link>
        </Reveal>

        <Reveal className="mt-12 w-full" delay={TERMS_DELAY_MS} variant="quiet">
          <p className="flex items-baseline justify-center gap-2.5">
            <span className="text-price text-foreground tabular-nums">
              <Price amount={TIER_PRICES[LICENSE_TIER.CORE]} />
            </span>
            <span className="text-spec text-muted-foreground">{t("terms")}</span>
          </p>

          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-label text-muted-foreground uppercase">
            {BADGES.map((badge) => (
              <li
                className="flex items-center gap-2.5 before:text-muted-foreground/30 before:content-['·'] first:before:hidden"
                key={badge}
              >
                {t(`badges.${badge}`)}
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-5 max-w-lg text-body-sm text-pretty text-muted-foreground">{t("assurance", CLI_GENERATION_VALUES)}</p>
        </Reveal>
      </div>
    </section>
  )
}
