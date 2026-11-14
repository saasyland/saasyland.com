import type { ComponentProps, JSX } from "react"

import { cn } from "~/src/lib/cn"

import { APP_LOGO_PATH, APP_NAME } from "~/src/presentation/branding"

export const Wordmark = ({ className, ...props }: Readonly<ComponentProps<"span">>): JSX.Element => (
  <span className={cn("flex items-center gap-2.5 text-foreground", className)} {...props}>
    <svg aria-hidden className="size-5.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d={APP_LOGO_PATH} />
    </svg>
    <span className="text-[0.9375rem] font-semibold tracking-[-0.02em]">{APP_NAME}</span>
  </span>
)
