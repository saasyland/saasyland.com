import type { ComponentProps, JSX } from "react"

import { cn } from "~/src/lib/cn"

// Read --border on the element so dark-mode descendants use their own palette.
export const backgroundGridPatternClassName =
  "bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[56px_56px]"

interface BackgroundProps extends ComponentProps<"div"> {
  readonly glow?: boolean
}

export const Background = ({ className, glow = true, ...props }: BackgroundProps): JSX.Element => (
  <>
    <div
      aria-hidden
      className={cn("field-taper pointer-events-none fixed inset-0 opacity-70", backgroundGridPatternClassName, className)}
      {...props}
    />
    {glow && <div aria-hidden className={cn("field-signal pointer-events-none fixed inset-0", className)} />}
  </>
)
