import type { ChangeEvent, ComponentType, JSX } from "react"

import { useHydrated } from "@tanstack/react-router"
import { Check } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { CURRENCY_FORMAT, PPP_COOKIE, PPP_DECLINED, PPP_KEYS, PPP_PERCENT, applyPpp } from "~/src/modules/_core/constants/pricing"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"
import type { LicenseTier } from "~/src/modules/license/license.schema"

import { TIERS, TIER_PRICES } from "~/src/data/marketing"

import { cn } from "~/src/lib/cn"
import { readCookie, serializeCookie } from "~/src/lib/cookie"

import { HighlightGroup, HighlightItem } from "~/src/presentation/components/custom/highlight"

export const FEATURE_IDS = ["f1", "f2", "f3", "f4", "f5", "f6"] as const

export const FEATURED_TIER = LICENSE_TIER.COMPLETE

export const REGIONAL_TAGS = { percent: () => <span className="ppp-percent" />, region: () => <span className="ppp-region" /> }

export type TierAction = ComponentType<Readonly<{ featured: boolean; tier: LicenseTier }>>

export const Price = ({ amount }: Readonly<{ amount: number }>): JSX.Element => {
  const formatter = useFormatter()
  const t = useTranslations("components.custom.pricing")

  return (
    <>
      {PPP_KEYS.map((key) => (
        <span className={`pv pv-${String(key)}`} key={key}>
          {formatter.number(applyPpp({ amount, multiplier: key / PPP_PERCENT }), CURRENCY_FORMAT)}
        </span>
      ))}
      <s className="pv pv-regional ms-[0.3em] text-[max(0.45em,0.875rem)] font-normal text-muted-foreground">
        <span className="sr-only">{t("regularPrice")} </span>
        {formatter.number(amount, CURRENCY_FORMAT)}
      </s>
    </>
  )
}

export const PRICE_TAGS = { price: () => <Price amount={TIER_PRICES[LICENSE_TIER.CORE]} /> }

const storeRegionalChoice = (event: ChangeEvent<HTMLInputElement>): void => {
  document.cookie = serializeCookie({
    name: PPP_COOKIE,
    options: { secure: globalThis.location.protocol === "https:" },
    value: event.currentTarget.checked ? "" : PPP_DECLINED,
  })
}

const TierColumn = ({ Action, tier }: Readonly<{ Action: TierAction; tier: LicenseTier }>): JSX.Element => {
  const t = useTranslations("components.custom.pricing")
  const isFeatured = tier === FEATURED_TIER

  return (
    <HighlightItem
      className={cn("border-border not-last:border-b @2xl:not-last:border-r @2xl:not-last:border-b-0", {
        "bg-background": !isFeatured,
        "bg-card": isFeatured,
      })}
      contentClassName="flex h-full flex-col"
      id={tier}
    >
      <div className={cn("flex h-10 items-center border-b border-border px-7 @2xl:px-8", { "border-t-2 border-t-ring": isFeatured })}>
        {isFeatured && <span className="font-mono text-spec tracking-[0.1em] text-ring uppercase">{t("mostPopular")}</span>}
      </div>

      <div className="flex flex-1 flex-col p-7 @2xl:p-8">
        <h3 className="text-title text-foreground">{t(`tiers.${tier}.name`)}</h3>
        <p className="mt-1.5 text-body-sm text-pretty text-muted-foreground @2xl:min-h-12">{t(`tiers.${tier}.whoFor`)}</p>

        <p className="mt-7 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-price text-foreground tabular-nums">
            <Price amount={TIER_PRICES[tier]} />
          </span>
          <span className="font-mono text-spec text-muted-foreground">{t(`tiers.${tier}.period`)}</span>
          <span className="pv pv-regional basis-full font-mono text-label text-ring uppercase">
            {t.rich("regional.save", REGIONAL_TAGS)}
          </span>
        </p>
        <p className="mt-3 text-body-sm text-pretty text-muted-foreground @2xl:min-h-12">{t(`tiers.${tier}.tagline`)}</p>

        <ul className="mt-7 space-y-3 border-t border-border pt-7">
          {FEATURE_IDS.map((feature) => (
            <li className="flex items-start gap-3" key={feature}>
              <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ring" strokeWidth={2.25} />
              <span className="text-body-sm text-pretty text-muted-foreground">{t(`tiers.${tier}.features.${feature}`)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-10 @2xl:pt-12">
          <Action featured={isFeatured} tier={tier} />
        </div>
      </div>
    </HighlightItem>
  )
}

const RegionalPricing = (): JSX.Element => {
  const t = useTranslations("components.custom.pricing")
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

export const PricingTiers = ({ Action }: Readonly<{ Action: TierAction }>): JSX.Element => (
  <div className="@container">
    <HighlightGroup className="grid overflow-hidden rounded-xl border border-border @2xl:grid-cols-3" name="pricing-highlight">
      {TIERS.map((tier) => (
        <TierColumn Action={Action} key={tier} tier={tier} />
      ))}
    </HighlightGroup>

    <RegionalPricing />
  </div>
)
