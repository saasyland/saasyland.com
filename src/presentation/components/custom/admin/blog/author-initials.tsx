import type { JSX } from "react"

export const AuthorInitials = ({ initials }: { readonly initials: string }): JSX.Element => (
  <span aria-hidden className="flex size-6 items-center justify-center rounded-md bg-muted text-[0.625rem] font-semibold text-foreground">
    {initials}
  </span>
)
