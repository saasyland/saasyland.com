import type { JSX, ReactNode } from "react"

import { MoreHorizontal } from "lucide-react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { DropdownMenu, DropdownMenuTrigger } from "~/src/presentation/components/shadcn/dropdown-menu"

export const RowMenu = ({
  children,
  isPending = false,
  label,
}: {
  readonly children: ReactNode
  readonly isPending?: boolean
  readonly label: string
}): JSX.Element => (
  <DropdownMenuTrigger>
    <Button aria-label={label} className="size-8 text-muted-foreground" isPending={isPending} size="icon" variant="ghost">
      <MoreHorizontal aria-hidden className="size-4" />
    </Button>
    <DropdownMenu className="min-w-48" placement="bottom end">
      {children}
    </DropdownMenu>
  </DropdownMenuTrigger>
)
