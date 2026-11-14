import type { JSX } from "react"

import { Link, useRouter } from "@tanstack/react-router"
import { Check } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"

import { CONSULTING_HOURLY_RATE, MARKETING_SECTION_IDS } from "~/src/data/marketing"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { cn } from "~/src/lib/cn"

import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"
import { PRICE_TAGS, PricingTiers, type TierAction } from "~/src/presentation/components/custom/pricing"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const GRID_DELAY_MS = 100

const CONSULTING_HREF = `mailto:${CONTACT_EMAIL}?subject=Architecture%20call`

const TierSignUpLink: TierAction = ({ featured, tier }) => {
  const t = useTranslations("components.custom.pricing")
  const router = useRouter()

  const { publicHref: redirect } = router.buildLocation({ search: { tier }, to: ROUTES.APP })

  return (
    <Link
      className={cn(
        "inline-flex h-11 w-full items-center justify-center rounded-lg px-5 text-body-sm font-semibold transition-[background-color,border-color,transform] duration-200 ease-exp focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px",
        {
          "bg-primary text-primary-foreground hover:bg-primary/88": featured,
          "border border-border text-foreground hover:bg-muted": !featured,
        },
      )}
      search={{ redirect }}
      to={ROUTES.SIGN_UP}
    >
      {t(`tiers.${tier}.cta`)}
    </Link>
  )
}

export const PricingSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.pricing")
  const format = useFormatter()

  return (
    <section className="relative border-t border-border" id={MARKETING_SECTION_IDS.PRICING}>
      <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <Reveal variant="heading">
          <div className="grid gap-x-16 gap-y-5 md:grid-cols-[1.1fr_1fr] md:items-end">
            <h2 className="max-w-[12ch] text-headline-peak text-balance text-foreground">{t("title")}</h2>
            <div>
              <p className="text-lead text-pretty text-muted-foreground">{t("description")}</p>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-14 md:mt-20" delay={GRID_DELAY_MS}>
          <PricingTiers Action={TierSignUpLink} />

          <p className="mt-8 flex max-w-3xl items-start gap-3">
            <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ring" strokeWidth={2.25} />
            <span className="text-body-sm text-pretty text-muted-foreground">{t("assurance", REPOSITORY_FACTS)}</span>
          </p>
        </Reveal>

        <Reveal className="mt-12 md:mt-14" delay={GRID_DELAY_MS} variant="quiet">
          <div className="grid gap-x-12 gap-y-7 rounded-xl border border-border bg-card p-7 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="font-mono text-label text-muted-foreground uppercase">{t("consulting.label")}</p>
              <h3 className="mt-3 max-w-[26ch] text-title text-balance text-foreground">{t("consulting.title")}</h3>
              <p className="mt-3 max-w-[64ch] text-body-sm text-pretty text-muted-foreground">{t("consulting.body")}</p>
            </div>

            <div className="flex flex-col items-stretch gap-4">
              <p className="flex items-baseline gap-2 md:justify-end">
                <span className="text-price text-foreground tabular-nums">{format.number(CONSULTING_HOURLY_RATE, CURRENCY_FORMAT)}</span>
                <span className="font-mono text-spec text-muted-foreground">{t("consulting.period")}</span>
              </p>
              <a
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-5 text-body-sm font-semibold whitespace-nowrap text-foreground transition-[background-color,border-color,transform] duration-200 ease-exp hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px"
                href={CONSULTING_HREF}
              >
                {t("consulting.cta")}
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-20 border-t border-border pt-14 md:mt-28 md:pt-16" delay={GRID_DELAY_MS}>
          <div className="grid gap-x-16 gap-y-6 md:grid-cols-[1fr_1fr] md:items-start">
            <p className="text-display-blast text-balance text-foreground">{t("ledger.lead")}</p>
            <p className="text-body text-pretty text-muted-foreground">{t.rich("ledger.body", { ...PRICE_TAGS, ...REPOSITORY_FACTS })}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
