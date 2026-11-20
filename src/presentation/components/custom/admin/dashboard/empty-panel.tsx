import type { JSX, ReactNode } from "react"

import { Inbox } from "lucide-react"

export const EmptyPanel = ({ children }: { readonly children: ReactNode }): JSX.Element => (
  <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
    <Inbox aria-hidden className="size-4 shrink-0" />
    {children}
  </p>
)
