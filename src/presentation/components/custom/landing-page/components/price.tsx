import type { JSX } from "react"

import { useFormatter, useTranslations } from "use-intl/react"

import { CURRENCY_FORMAT, PPP_KEYS, PPP_PERCENT, applyPpp } from "~/src/modules/_core/constants/pricing"

import { TIER_PRICES } from "~/src/data/marketing"

export const Price = ({ amount }: Readonly<{ amount: number }>): JSX.Element => {
  const formatter = useFormatter()
  const t = useTranslations("pages.landing.pricing")

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

export const PRICE_TAGS = { price: () => <Price amount={TIER_PRICES.core} /> }
