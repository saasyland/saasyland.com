import type { JSX, ReactNode } from "react"

import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { cn } from "~/src/lib/cn"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

interface AdminPageHeaderProps {
  readonly actions?: ReactNode
  readonly back?: { readonly label: string; readonly to: string }
  readonly children?: ReactNode
  readonly description?: ReactNode
  readonly tabs?: ReactNode
  readonly title: ReactNode
}

export const AdminPageHeader = ({ actions, back, children, description, tabs, title }: AdminPageHeaderProps): JSX.Element => (
  <header className={cn("flex shrink-0 flex-col gap-5 border-b border-border", { "pb-6": tabs === undefined })}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {back !== undefined && (
          <Link
            className="mb-2 flex w-fit items-center gap-1.5 rounded-sm text-body-sm text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            to={back.to}
          >
            <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
            <span className="truncate">{back.label}</span>
          </Link>
        )}
        <h1 className="text-statement font-semibold text-balance text-foreground">{title}</h1>
        {description !== undefined && <p className="max-w-2xl text-body-sm text-pretty text-muted-foreground">{description}</p>}
        {children}
      </div>
      {actions !== undefined && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {tabs}
  </header>
)

interface AdminPageHeaderPendingProps {
  readonly actions?: number
  readonly children?: ReactNode
  readonly hasBack?: boolean
  readonly tabs?: number
}

export const AdminPageHeaderPending = ({ actions = 0, children, hasBack = false, tabs = 0 }: AdminPageHeaderPendingProps): JSX.Element => (
  <div className={cn("flex shrink-0 flex-col gap-5 border-b border-border", { "pb-6": tabs === 0 })}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {hasBack && <Skeleton className="mb-2 h-lh w-28 scale-y-70 text-body-sm" />}
        <Skeleton className="h-lh w-44 scale-y-70 text-statement" />
        {children ?? <Skeleton className="h-lh w-96 max-w-full scale-y-70 text-body-sm" />}
      </div>
      {actions > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          {Array.from({ length: actions }, (_, index) => (
            <Skeleton className="h-9 w-32 rounded-md" key={index} />
          ))}
        </div>
      )}
    </div>
    {tabs > 0 && (
      <div className="flex h-8 items-center gap-6 p-[3px]">
        {Array.from({ length: tabs }, (_, index) => (
          <Skeleton className="h-lh w-20 shrink-0 scale-y-70 text-sm" key={index} />
        ))}
      </div>
    )}
  </div>
)
