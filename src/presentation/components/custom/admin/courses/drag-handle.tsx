import type { JSX } from "react"

import { GripVertical } from "lucide-react"

import { Button } from "~/src/presentation/components/shadcn/button"

export const DragHandle = (): JSX.Element => (
  <Button
    className="size-8 cursor-grab text-muted-foreground/60 hover:bg-transparent hover:text-foreground active:cursor-grabbing"
    size="icon"
    slot="drag"
    variant="ghost"
  >
    <GripVertical aria-hidden className="size-4" />
  </Button>
)
