import { ReceiptText } from "lucide-react"

import { searchOrdersQuery } from "~/src/modules/order/use-cases/search-orders"

import type { CommandSearch } from "~/src/data/command-search"

const AREA = "payments"

export const PAYMENTS_COMMAND_SEARCHES = [
  {
    area: AREA,
    icon: ReceiptText,
    key: "orders",
    order: 20,
    permission: { order: ["read"] },
    query: ({ text }) => searchOrdersQuery({ text }),
  },
] as const satisfies readonly CommandSearch[]
