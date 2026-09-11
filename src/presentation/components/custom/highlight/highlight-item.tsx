import { type ComponentProps, type JSX, use } from "react"

import { cn } from "~/src/lib/cn"

import { HighlightGlow } from "~/src/presentation/components/custom/highlight/highlight-glow"
import { HighlightContext } from "~/src/presentation/components/custom/highlight/highlight-group"

type HighlightItemProps = Pick<ComponentProps<"div">, "children" | "className"> & {
  readonly contentClassName?: string
  readonly id: string
}

export const HighlightItem = ({ children, className, contentClassName, id }: HighlightItemProps): JSX.Element => {
  const { element, hovered, name, setHovered } = use(HighlightContext)
  const isLit = hovered === id

  const enter = (): void => {
    setHovered(id)
  }

  if (element === "dl") {
    return (
      <div className={cn("relative [&>dd]:relative [&>dt]:relative", isLit && "z-10", className, contentClassName)} onMouseEnter={enter}>
        <HighlightGlow isLit={isLit} name={name} />
        {children}
      </div>
    )
  }

  return (
    <div className={cn("relative", isLit && "z-10", className)} onMouseEnter={enter}>
      <HighlightGlow isLit={isLit} name={name} />
      <div className={cn("relative", contentClassName)}>{children}</div>
    </div>
  )
}
