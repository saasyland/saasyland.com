import type { JSX, ReactNode } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

interface ContentPageProps {
  readonly children?: ReactNode
  readonly lead: ReactNode
  readonly title: ReactNode
}

const CONTAINER_CLASSNAME = "mx-auto w-full max-w-7xl px-6 py-24 md:px-10 md:py-32"

export const ContentPage = ({ children, lead, title }: ContentPageProps): JSX.Element => (
  <section className="relative">
    <div className={CONTAINER_CLASSNAME}>
      <h1 className="max-w-[20ch] text-headline-peak text-balance text-foreground">{title}</h1>
      <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{lead}</p>
      {children}
    </div>
  </section>
)

export const ContentPagePending = ({ children }: { readonly children?: ReactNode }): JSX.Element => (
  <section aria-busy="true" className="relative">
    <div className={CONTAINER_CLASSNAME}>
      <Skeleton className="h-lh w-full max-w-[14ch] scale-y-75 text-headline-peak" />
      <div className="mt-5 flex max-w-2xl flex-col text-lead">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-3/5 scale-y-70" />
      </div>
      {children}
    </div>
  </section>
)
