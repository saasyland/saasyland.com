import type { JSX } from "react"

import { useFormatter, useTranslations } from "use-intl/react"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import { PPP_KEYS, regionalPrice } from "~/src/modules/license/license.pricing"

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
