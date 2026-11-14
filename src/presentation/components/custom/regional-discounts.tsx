import type { JSX } from "react"

import { useFormatter } from "use-intl/react"

import { PPP_PERCENT, PPP_PERCENTS_OFF } from "~/src/modules/_core/constants/pricing"

export const RegionalDiscounts = (): JSX.Element => {
  const format = useFormatter()

  return <>{format.list(PPP_PERCENTS_OFF.map((percentOff) => format.number(percentOff / PPP_PERCENT, { style: "percent" })))}</>
}
