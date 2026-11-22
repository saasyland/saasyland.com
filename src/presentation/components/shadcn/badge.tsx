import type { ComponentProps } from "react"

import { type VariantProps, cva } from "class-variance-authority"

import { cn } from "~/src/lib/cn"

const badgeVariants = cva(
  "inline-block h-5.5 w-fit shrink-0 content-center overflow-hidden rounded-md border px-2.5 text-label leading-none tracking-normal whitespace-nowrap [text-box:trim-both_cap_alphabetic]",
  {
    defaultVariants: {
      variant: "neutral",
    },
    variants: {
      variant: {
        accent: "border-ring/30 bg-ring/10 text-cyan-800 dark:text-ring",
        destructive: "border-destructive/25 bg-destructive/10 text-red-700 dark:text-red-300",
        neutral: "border-border bg-muted text-muted-foreground",
        warning: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-400",
      },
    },
  },
)

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

const Badge = ({ className, variant = "neutral", ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) => (
  <span data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
)

export { Badge, type BadgeVariant }
