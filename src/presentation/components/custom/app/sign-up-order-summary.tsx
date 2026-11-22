import { type JSX, type ReactNode, useId } from "react"

import { Link } from "@tanstack/react-router"
import { Check } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { PURCHASE_STEP, PURCHASE_STEP_COUNT, redirectTierSchema } from "~/src/data/license"
import { TIER_PRICES } from "~/src/data/marketing"
import { REFUND_TERMS } from "~/src/data/refunds"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { Price } from "~/src/presentation/components/custom/pricing"

import { ROUTES } from "~/src/routes"

const REFUNDS_LINK_CLASS =
  "text-foreground underline underline-offset-4 transition-colors duration-200 ease-exp hover:text-muted-foreground"

export const SignUpOrderSummary = ({ redirect }: Readonly<{ redirect: string | undefined }>): JSX.Element => {
  const tTier = useTranslations("components.custom.pricing")
  const t = useTranslations("components.custom.sign-up-order-summary")
  const headingId = useId()

  const tier = redirectTierSchema.parse(redirect)
  const amount = TIER_PRICES[tier]

  return (
    <section aria-labelledby={headingId} className="mt-6 rounded-lg border border-ring/40 bg-card p-5">
      <h2 className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-title text-foreground" id={headingId}>
        <span>{tTier(`tiers.${tier}.name`)}</span>{" "}
        <span className="flex items-baseline gap-2">
          <span className="tabular-nums">
            <Price amount={amount} />
          </span>{" "}
          <span className="text-spec font-normal text-muted-foreground">{tTier(`tiers.${tier}.period`)}</span>
        </span>
      </h2>
      <p className="mt-2 text-body-sm text-pretty text-muted-foreground">
        {t.rich("steps", {
          current: PURCHASE_STEP.ACCOUNT,
          price: () => <Price amount={amount} />,
          step: (chunks: ReactNode) => <span className="font-medium text-foreground">{chunks}</span>,
          total: PURCHASE_STEP_COUNT,
        })}
      </p>
      <p className="mt-3 flex items-start gap-2.5 text-body-sm text-pretty text-muted-foreground">
        <Check aria-hidden className="mt-0.75 size-3.5 shrink-0 text-ring" strokeWidth={2.25} />
        <span>
          {t.rich("refund", {
            days: REFUND_TERMS.WITHDRAWAL_DAYS,
            refunds: (chunks: ReactNode) => (
              <Link className={REFUNDS_LINK_CLASS} to={ROUTES.REFUNDS}>
                {chunks}
              </Link>
            ),
          })}
        </span>
      </p>
    </section>
  )
}

export const SignUpOrderSummaryPending = (): JSX.Element => (
  <div className="mt-6 rounded-lg border border-ring/40 bg-card p-5">
    <div className="flex items-baseline justify-between gap-4 text-title">
      <Skeleton className="h-lh w-24 scale-y-70" />
      <Skeleton className="h-lh w-28 scale-y-70" />
    </div>
    <div className="mt-2 flex flex-col text-body-sm">
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-1/3 scale-y-70" />
    </div>
    <div className="mt-3 flex items-start gap-2.5 text-body-sm">
      <Skeleton className="mt-0.75 size-3.5 shrink-0 rounded-sm" />
      <div className="flex flex-1 flex-col">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-1/2 scale-y-70" />
      </div>
    </div>
  </div>
)
