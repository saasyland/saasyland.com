import type { ChangeEvent, JSX } from "react"

import { Link, useHydrated } from "@tanstack/react-router"
import { Check } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { PPP_COOKIE, PPP_DECLINED } from "~/src/modules/_core/constants/pricing"

import { MARKETING_SECTION_IDS, TIERS, TIER_PRICES } from "~/src/data/marketing"

import { cn } from "~/src/lib/cn"
import { readCookie, serializeCookie } from "~/src/lib/cookie"

import { HighlightGroup, HighlightItem } from "~/src/presentation/components/custom/highlight"
import { PRICE_TAGS, Price } from "~/src/presentation/components/custom/landing-page/components/price"
import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const GRID_DELAY_MS = 100

const FEATURE_IDS = ["f1", "f2", "f3", "f4", "f5", "f6"] as const

const FEATURED_TIER = "complete"

const CONSULTING_HREF = `mailto:${CONTACT_EMAIL}?subject=Architecture%20call`

const REGIONAL_TAGS = { percent: () => <span className="ppp-percent" />, region: () => <span className="ppp-region" /> }

const storeRegionalChoice = (event: ChangeEvent<HTMLInputElement>): void => {
  document.cookie = serializeCookie({
    name: PPP_COOKIE,
    options: { secure: globalThis.location.protocol === "https:" },
    value: event.currentTarget.checked ? "" : PPP_DECLINED,
  })
}

const TierColumn = ({ tier }: Readonly<{ tier: (typeof TIERS)[number] }>): JSX.Element => {
  const t = useTranslations("pages.landing.pricing")
  const isFeatured = tier === FEATURED_TIER

  return (
    <HighlightItem
      className={cn("border-border not-last:border-b md:not-last:border-r md:not-last:border-b-0", {
        "bg-background": !isFeatured,
        "bg-card": isFeatured,
      })}
      contentClassName="flex h-full flex-col"
      id={tier}
    >
      <div className={cn("flex h-10 items-center border-b border-border px-7 md:px-8", { "border-t-2 border-t-ring": isFeatured })}>
        {isFeatured && <span className="font-mono text-spec tracking-[0.1em] text-ring uppercase">{t("mostPopular")}</span>}
      </div>

      <div className="flex flex-1 flex-col p-7 md:p-8">
        <h3 className="text-title text-foreground">{t(`tiers.${tier}.name`)}</h3>
        <p className="mt-1.5 text-body-sm text-pretty text-muted-foreground md:min-h-12">{t(`tiers.${tier}.whoFor`)}</p>

        <p className="mt-7 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-price text-foreground tabular-nums">
            <Price amount={TIER_PRICES[tier]} />
          </span>
          <span className="font-mono text-spec text-muted-foreground">{t(`tiers.${tier}.period`)}</span>
          <span className="pv pv-regional basis-full font-mono text-label text-ring uppercase">
            {t.rich("regional.save", REGIONAL_TAGS)}
          </span>
        </p>
        <p className="mt-3 text-body-sm text-pretty text-muted-foreground md:min-h-12">{t(`tiers.${tier}.tagline`)}</p>

        <ul className="mt-7 space-y-3 border-t border-border pt-7">
          {FEATURE_IDS.map((feature) => (
            <li className="flex items-start gap-3" key={feature}>
              <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ring" strokeWidth={2.25} />
              <span className="text-body-sm text-pretty text-muted-foreground">{t(`tiers.${tier}.features.${feature}`)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-10 md:pt-12">
          <Link
            className={cn(
              "inline-flex h-11 w-full items-center justify-center rounded-lg px-5 text-body-sm font-semibold transition-[background-color,border-color,transform] duration-200 ease-exp focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px",
              {
                "bg-primary text-primary-foreground hover:bg-primary/88": isFeatured,
                "border border-border text-foreground hover:bg-muted": !isFeatured,
              },
            )}
            to={ROUTES.SIGN_UP}
            search={{ tier }}
          >
            {t(`tiers.${tier}.cta`)}
          </Link>
        </div>
      </div>
    </HighlightItem>
  )
}

const RegionalPricing = (): JSX.Element => {
  const t = useTranslations("pages.landing.pricing")
  const declined = useHydrated() && readCookie({ header: document.cookie, name: PPP_COOKIE }) === PPP_DECLINED

  return (
    <label className="ppp-offer mt-6 cursor-pointer items-start gap-3 rounded-xl border border-ring/35 bg-ring/6 px-5 py-4">
      <span className="relative mt-0.75 flex size-4 shrink-0">
        <input
          className="peer size-4 cursor-pointer appearance-none rounded-[4px] border border-input bg-background transition-colors checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          defaultChecked={!declined}
          onChange={storeRegionalChoice}
          type="checkbox"
        />
        <Check
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto size-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100"
          strokeWidth={3}
        />
      </span>
      <span className="text-body-sm text-pretty text-foreground">{t.rich("regional.offer", REGIONAL_TAGS)}</span>
    </label>
  )
}

export const PricingSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.pricing")

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
          <HighlightGroup className="grid overflow-hidden rounded-xl border border-border md:grid-cols-3" name="pricing-highlight">
            {TIERS.map((tier) => (
              <TierColumn key={tier} tier={tier} />
            ))}
          </HighlightGroup>

          <RegionalPricing />

          <p className="mt-8 flex max-w-3xl items-start gap-3">
            <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ring" strokeWidth={2.25} />
            <span className="text-body-sm text-pretty text-muted-foreground">{t("assurance")}</span>
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
                <span className="text-price text-foreground tabular-nums">{t("consulting.price")}</span>
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
            <p className="text-body text-pretty text-muted-foreground">{t.rich("ledger.body", PRICE_TAGS)}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
