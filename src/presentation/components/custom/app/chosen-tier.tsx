import { type JSX, useId } from "react"

import { useTranslations } from "use-intl/react"

import type { LicenseTier } from "~/src/modules/license/license.schema"

import { TIER_PRICES } from "~/src/data/marketing"

import { CheckoutAgreement, CheckoutButton } from "~/src/presentation/components/custom/app/checkout"
import { Price, REGIONAL_TAGS } from "~/src/presentation/components/custom/pricing"

export const ChosenTier = ({ tier }: Readonly<{ tier: LicenseTier }>): JSX.Element => {
  const tTier = useTranslations("components.custom.pricing")
  const t = useTranslations("pages.license.chosen")
  const headingId = useId()

  const name = tTier(`tiers.${tier}.name`)

  return (
    <section aria-labelledby={headingId} className="overflow-hidden rounded-xl border border-ring/40 bg-card">
      <div className="grid gap-x-10 gap-y-7 p-6 md:p-8 lg:grid-cols-[1fr_18rem] lg:items-end">
        <div>
          <h2 className="text-title text-balance text-foreground" id={headingId}>
            {t("title", { tier: name })}
          </h2>
          <p className="mt-2 max-w-[60ch] text-body-sm text-pretty text-muted-foreground">{t("description", { tier: name })}</p>
          <p className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-price text-foreground tabular-nums">
              <Price amount={TIER_PRICES[tier]} />
            </span>
            <span className="font-mono text-spec text-muted-foreground">{tTier(`tiers.${tier}.period`)}</span>
            <span className="pv pv-regional basis-full font-mono text-label text-ring uppercase">
              {tTier.rich("regional.save", REGIONAL_TAGS)}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <CheckoutButton featured tier={tier}>
            {t("continue")}
          </CheckoutButton>
          <CheckoutAgreement />
        </div>
      </div>
    </section>
  )
}
