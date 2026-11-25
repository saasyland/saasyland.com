import type { JSX } from "react"

import { useFormatter } from "use-intl/react"

import type { Order } from "~/src/modules/order/order.types"

export const MoneyAmount = ({ money }: { readonly money: Order["money"] }): JSX.Element => {
  const format = useFormatter()

  return <span className="tabular-nums">{format.number(money.amount, { currency: money.currency, style: "currency" })}</span>
}
