import type { ReactNode } from "react"

export const ADDRESS_TAGS = {
  address: (chunks: ReactNode) => <strong className="font-medium wrap-break-word text-foreground">{chunks}</strong>,
}
