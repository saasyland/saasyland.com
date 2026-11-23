import { type ComponentType, type JSX, type ReactNode, useId } from "react"

import { Link, useHydrated } from "@tanstack/react-router"
import { BadgeCheck, Check, CircleDashed, FlaskConical, Receipt, RotateCcw } from "lucide-react"
import { CheckboxButton, CheckboxField } from "react-aria-components"
import { useFormatter, useTranslations } from "use-intl/react"

import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIER, LICENSE_TIERS, type LicenseTier } from "~/src/modules/license/license.constants"
import { PPP_COOKIE, PPP_DECLINED, PPP_KEYS, regionalPrice } from "~/src/modules/license/license.pricing"

import { CLI_GENERATION_VALUES } from "~/src/data/cli"
import { COURSE_PLATFORM_VALUES, TIER_FEATURES, TIER_PRICES } from "~/src/data/marketing"
import { FEATURE_STATUS, FEATURE_STATUSES, type FeatureStatus } from "~/src/data/navigation.constants"
import { CURRENCY_FORMAT } from "~/src/data/pricing"
import { REFUND_TERMS } from "~/src/data/refunds"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { cn } from "~/src/lib/cn"
import { readCookie, serializeCookie } from "~/src/lib/cookie"

import { HighlightGroup, HighlightItem } from "~/src/presentation/components/custom/highlight"

import * as ROUTES from "~/src/routes"

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
          {formatter.number(regionalPrice(amount, key), CURRENCY_FORMAT)}
        </span>
      ))}
      <s className="pv pv-regional ms-[0.3em] text-body-sm font-normal text-muted-foreground">
        <span className="sr-only">{t("regularPrice")} </span>
        {formatter.number(amount, CURRENCY_FORMAT)}
      </s>
    </>
  )
}

export const PRICE_TAGS = { price: () => <Price amount={TIER_PRICES[LICENSE_TIER.CORE]} /> }

const storeRegionalChoice = (isSelected: boolean): void => {
  document.cookie = serializeCookie({
    name: PPP_COOKIE,
    options: { secure: globalThis.location.protocol === "https:" },
    value: isSelected ? "" : PPP_DECLINED,
  })
}

const FEATURE_VALUES = { coverageThreshold: REPOSITORY_FACTS.coverageThreshold, ...COURSE_PLATFORM_VALUES }

const FEATURE_ICONS = { [FEATURE_STATUS.ARRIVING]: CircleDashed, [FEATURE_STATUS.AVAILABLE]: Check } as const

export const tierFeaturesWith = (tier: LicenseTier, status: FeatureStatus): readonly { readonly id: string }[] => {
  const features: readonly { readonly id: string; readonly status: FeatureStatus }[] = TIER_FEATURES[tier]

  return features.filter((feature) => feature.status === status)
}

const TierFeature = ({ children, status }: Readonly<{ children: ReactNode; status: FeatureStatus }>): JSX.Element => {
  const Icon = FEATURE_ICONS[status]

  return (
    <li className="flex items-start gap-3">
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-3.5 shrink-0", {
          "text-muted-foreground/70": status === FEATURE_STATUS.ARRIVING,
          "text-ring": status === FEATURE_STATUS.AVAILABLE,
        })}
        strokeWidth={2.25}
      />
      <span className="text-body-sm text-pretty text-muted-foreground">{children}</span>
    </li>
  )
}

const TierFeatures = ({ tier }: Readonly<{ tier: LicenseTier }>): JSX.Element => {
  const t = useTranslations("components.custom.pricing")
  const id = useId()

  return (
    <div className="mt-7 space-y-6 border-t border-border pt-7">
      {FEATURE_STATUSES.map((status) => (
        <div key={status}>
          <p className="text-label text-muted-foreground uppercase" id={`${id}-${status}`}>
            {t(`status.${status}`)}
          </p>
          <ul aria-labelledby={`${id}-${status}`} className="mt-3 space-y-3">
            {tierFeaturesWith(tier, status).map((feature) => (
              <TierFeature key={feature.id} status={status}>
                {t(`tiers.${tier}.features.${feature.id}`, FEATURE_VALUES)}
              </TierFeature>
            ))}
            {status === FEATURE_STATUS.AVAILABLE && (
              <TierFeature status={status}>{t("machines", { limit: LICENSE_ACTIVATION_LIMITS[tier] })}</TierFeature>
            )}
          </ul>
        </div>
      ))}
    </div>
  )
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
        {isFeatured && <span className="text-label text-ring uppercase">{t("recommended")}</span>}
      </div>

      <div className="flex flex-1 flex-col p-7 @2xl:p-8">
        <h3 className="text-title text-foreground">{t(`tiers.${tier}.name`)}</h3>
        <p className="mt-1.5 text-body-sm text-pretty text-muted-foreground @2xl:min-h-12">{t(`tiers.${tier}.whoFor`)}</p>

        <p className="mt-7 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-price text-foreground tabular-nums">
            <Price amount={TIER_PRICES[tier]} />
          </span>
          <span className="text-spec text-muted-foreground">{t(`tiers.${tier}.period`)}</span>
          <span className="pv pv-regional basis-full text-label text-ring uppercase">{t.rich("regional.save", REGIONAL_TAGS)}</span>
        </p>
        <p className="mt-3 text-body-sm text-pretty text-muted-foreground @2xl:min-h-12">
          {t(`tiers.${tier}.tagline`, CLI_GENERATION_VALUES)}
        </p>

        <div className="mt-7 @2xl:order-last @2xl:mt-auto @2xl:pt-12">
          <Action featured={isFeatured} tier={tier} />
        </div>

        <TierFeatures tier={tier} />
      </div>
    </HighlightItem>
  )
}

const RegionalPricing = (): JSX.Element => {
  const t = useTranslations("components.custom.pricing")
  const declined = useHydrated() && readCookie({ header: document.cookie, name: PPP_COOKIE }) === PPP_DECLINED

  return (
    <CheckboxField defaultSelected={!declined} key={String(declined)} onChange={storeRegionalChoice}>
      <CheckboxButton className="group ppp-offer mt-6 cursor-pointer items-start gap-3 rounded-lg border border-ring/35 bg-ring/6 px-5 py-4">
        <span className="relative mt-0.75 flex size-4 shrink-0 rounded-sm border border-input bg-background transition-colors group-has-checked:border-primary group-has-checked:bg-primary group-data-focus-visible:outline-2 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-ring">
          <Check
            aria-hidden
            className="pointer-events-none absolute inset-0 m-auto size-3.5 text-primary-foreground opacity-0 group-has-checked:opacity-100"
            strokeWidth={3}
          />
        </span>
        <span className="text-body-sm text-pretty text-foreground">{t.rich("regional.offer", REGIONAL_TAGS)}</span>
      </CheckboxButton>
    </CheckboxField>
  )
}

const TRUST_TAGS = {
  days: REFUND_TERMS.WITHDRAWAL_DAYS,
  refunds: (chunks: ReactNode) => (
    <Link
      className="underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      to={ROUTES.REFUNDS}
    >
      {chunks}
    </Link>
  ),
}

export const PRICING_TRUST_ITEMS = ["merchant", "tax", "refund", "beta"] as const

const TRUST_ICONS = { beta: FlaskConical, merchant: BadgeCheck, refund: RotateCcw, tax: Receipt } as const

const PricingTrust = (): JSX.Element => {
  const t = useTranslations("components.custom.pricing.trust")

  return (
    <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {PRICING_TRUST_ITEMS.map((id) => {
        const Icon = TRUST_ICONS[id]

        return (
          <li className="flex items-start gap-3" key={id}>
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-ring" strokeWidth={1.75} />
            <span className="text-body-sm text-pretty text-muted-foreground">{t.rich(id, TRUST_TAGS)}</span>
          </li>
        )
      })}
    </ul>
  )
}

export const PricingTiers = ({ Action }: Readonly<{ Action: TierAction }>): JSX.Element => (
  <div className="@container">
    <HighlightGroup className="grid overflow-hidden rounded-lg border border-border @2xl:grid-cols-3" name="pricing-highlight">
      {LICENSE_TIERS.map((tier) => (
        <TierColumn Action={Action} key={tier} tier={tier} />
      ))}
    </HighlightGroup>

    <RegionalPricing />
    <PricingTrust />
  </div>
)
