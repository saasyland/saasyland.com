import { type JSX, Suspense, useId } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { ArrowUpRight } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import { LICENSE_ACTIVATION_LIMITS, type LicenseTier } from "~/src/modules/license/license.constants"
import { upgradePriceQuery } from "~/src/modules/license/use-cases/get-upgrade-price"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { CheckoutButton, CheckoutNotice } from "~/src/presentation/components/custom/app/checkout"

const UpgradeCard = ({ tier }: Readonly<{ tier: LicenseTier }>): JSX.Element | undefined => {
  const tTier = useTranslations("components.custom.pricing")
  const t = useTranslations("pages.license.upgrade")
  const format = useFormatter()
  const headingId = useId()

  const { upgrade } = useSuspenseQuery(upgradePriceQuery({ tier })).data

  if (upgrade === undefined) {
    return undefined
  }

  const names = { from: tTier(`tiers.${upgrade.fromTier}.name`), tier: tTier(`tiers.${tier}.name`) }

  return (
    <section aria-labelledby={headingId} className="overflow-hidden rounded-lg border border-ring/40 bg-card">
      <div className="grid gap-x-10 gap-y-7 p-6 md:p-8 lg:grid-cols-[1fr_18rem] lg:items-end">
        <div>
          <h2 className="flex items-center gap-2 text-title text-balance text-foreground" id={headingId}>
            <ArrowUpRight aria-hidden className="size-5 shrink-0 text-ring" strokeWidth={2} />
            {t("title", names)}
          </h2>
          <p className="mt-2 max-w-[60ch] text-body-sm text-pretty text-muted-foreground">{t("description", names)}</p>
          <p className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-price text-foreground tabular-nums">{format.number(upgrade.amount, CURRENCY_FORMAT)}</span>
            <span className="text-spec text-muted-foreground">{t("period")}</span>
          </p>
          <p className="mt-2 text-body-sm text-pretty text-muted-foreground">
            {t("breakdown", {
              ...names,
              credit: format.number(upgrade.credit, CURRENCY_FORMAT),
              price: format.number(upgrade.price, CURRENCY_FORMAT),
            })}
          </p>
          <p className="mt-4 max-w-[60ch] text-body-sm text-pretty text-foreground">
            {t("key", { from: LICENSE_ACTIVATION_LIMITS[upgrade.fromTier], to: LICENSE_ACTIVATION_LIMITS[tier] })}
          </p>
        </div>
        <CheckoutButton featured tier={tier}>
          {t("cta", names)}
        </CheckoutButton>
      </div>
      <div className="border-t border-border px-6 py-4 md:px-8">
        <CheckoutNotice />
      </div>
    </section>
  )
}

export const UpgradeOfferPending = (): JSX.Element => (
  <div className="overflow-hidden rounded-lg border border-ring/40 bg-card">
    <div className="grid gap-x-10 gap-y-7 p-6 md:p-8 lg:grid-cols-[1fr_18rem] lg:items-end">
      <div>
        <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-title" />
        <Skeleton className="mt-2 h-lh w-full max-w-[60ch] scale-y-70 text-body-sm" />
        <Skeleton className="mt-6 h-lh w-24 scale-y-70 text-price" />
        <Skeleton className="mt-2 h-lh w-2/3 scale-y-70 text-body-sm" />
        <Skeleton className="mt-4 h-lh w-3/4 scale-y-70 text-body-sm" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  </div>
)

export const UpgradeOffer = ({ tier }: Readonly<{ tier: LicenseTier }>): JSX.Element => (
  <Suspense fallback={<UpgradeOfferPending />}>
    <UpgradeCard tier={tier} />
  </Suspense>
)
