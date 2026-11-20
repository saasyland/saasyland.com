import type { JSX } from "react"

import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { CTA_CLASSES } from "~/src/data/cta"
import { BILLING_GENERATION } from "~/src/data/marketing"
import { MARKETING_SECTION_IDS } from "~/src/data/navigation.constants"

import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

const CTA_DELAY_MS = 100

export const RallySection = (): JSX.Element => {
  const t = useTranslations("pages.landing.rally")

  return (
    <section className="relative overflow-hidden border-t border-border">
      <div aria-hidden className="field-grid pointer-events-none absolute inset-0" />
      <div aria-hidden className="field-signal field-taper pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid w-full max-w-site gap-x-16 gap-y-8 px-6 py-20 md:grid-cols-[1.2fr_auto] md:items-end md:px-10 md:py-24">
        <Reveal variant="heading">
          <h2 className="max-w-[20ch] text-headline-peak text-balance text-foreground">{t("title")}</h2>
          <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{t("body", { billing: BILLING_GENERATION })}</p>
        </Reveal>

        <Reveal className="flex flex-wrap items-center gap-x-3 gap-y-4 md:pb-1" delay={CTA_DELAY_MS} variant="quiet">
          <a className={CTA_CLASSES.PRIMARY} href={`#${MARKETING_SECTION_IDS.CLI}`}>
            {t("ctaPrimary")}
          </a>
          <a className={CTA_CLASSES.SECONDARY} href={`#${MARKETING_SECTION_IDS.PRICING}`}>
            {t("ctaSecondary")}
            <ArrowRight
              aria-hidden
              className="size-3.5 text-muted-foreground transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
              strokeWidth={2}
            />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
