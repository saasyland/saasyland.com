import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { PACKAGE_MANAGERS } from "~/src/data/cli"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { Navigation } from "~/src/presentation/components/custom/navigation"
import { PageFrame } from "~/src/presentation/components/custom/page-frame"

import { ROUTES } from "~/src/routes"

const LEGAL_SECTIONS = ["first", "second", "third", "fourth"] as const

export const HomePending = (): JSX.Element => (
  <section aria-busy="true" className="relative overflow-hidden">
    <div className="field-grid pointer-events-none absolute inset-0" />
    <div className="relative mx-auto w-full max-w-7xl px-6 pt-32 pb-16 md:px-10 md:pt-40 md:pb-20">
      <div className="flex max-w-[11.6em] flex-col text-display-hero">
        <Skeleton className="h-lh w-full scale-y-75" />
        <Skeleton className="h-lh w-11/12 scale-y-75" />
        <Skeleton className="h-lh w-3/5 scale-y-75" />
      </div>
      <div className="mt-6 flex max-w-2xl flex-col text-lead">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-11/12 scale-y-70" />
        <Skeleton className="h-lh w-1/3 scale-y-70" />
      </div>
      <div className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-4">
        <Skeleton className="h-11 w-33 rounded-lg" />
        <Skeleton className="h-11 w-40 rounded-lg border border-border bg-card/60" />
      </div>
      <div className="mt-16 overflow-hidden rounded-xl border border-border bg-card md:mt-20">
        <div className="flex h-10 items-center gap-1 bg-background/40 px-2">
          {PACKAGE_MANAGERS.map((manager) => (
            <Skeleton className="h-7 w-12 rounded-md" key={manager.id} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-border bg-background/40 py-2 pr-2 pl-4">
          <Skeleton className="h-lh w-64 scale-y-70 font-mono text-spec" />
          <Skeleton className="size-7 rounded-md" />
        </div>
        <Skeleton className="aspect-8/5 w-[190%] max-w-none rounded-none sm:w-[135%] md:w-full" />
      </div>
    </div>
  </section>
)

export const LegalPending = (): JSX.Element => (
  <div aria-busy="true" className="container mx-auto max-w-3xl px-6 py-16 md:py-24">
    <div className="flex flex-col gap-4">
      <Skeleton className="h-lh w-48 scale-y-70 text-sm" />
      <Skeleton className="h-lh w-1/2 scale-y-70 text-3xl md:text-4xl" />
      <div className="flex flex-col text-base leading-relaxed">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-3/5 scale-y-70" />
      </div>
    </div>
    <div className="mt-12 flex flex-col gap-10">
      {LEGAL_SECTIONS.map((section) => (
        <div className="flex flex-col gap-3" key={section}>
          <Skeleton className="h-lh w-2/5 scale-y-70 text-xl" />
          <div className="flex flex-col text-sm leading-relaxed">
            <Skeleton className="h-lh w-full scale-y-70" />
            <Skeleton className="h-lh w-full scale-y-70" />
            <Skeleton className="h-lh w-2/3 scale-y-70" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const NewsletterPending = (): JSX.Element => (
  <section aria-busy="true" className="relative">
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-32 md:py-40">
      <Skeleton className="h-lh w-4/5 max-w-sm scale-y-75 text-headline-peak" />
      <div className="mt-5 flex w-full flex-col items-center text-lead">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-3/5 scale-y-70" />
      </div>
      <Skeleton className="mt-8 h-lh w-4/5 scale-y-70 text-body-sm" />
      <Skeleton className="mt-10 h-lh w-28 scale-y-70 text-body-sm" />
    </div>
  </section>
)

export const PremiumPending = (): JSX.Element => (
  <div aria-busy="true">
    <Skeleton className="h-lh w-40 scale-y-70" />
  </div>
)

const MARKETING_PAGES = new Map<string, () => JSX.Element>([
  [ROUTES.HOME, HomePending],
  [ROUTES.LICENCE, LegalPending],
  [ROUTES.NEWSLETTER_CONFIRM, NewsletterPending],
  [ROUTES.NEWSLETTER_UNSUBSCRIBE, NewsletterPending],
  [ROUTES.PREMIUM, PremiumPending],
  [ROUTES.PRIVACY, LegalPending],
  [ROUTES.REFUNDS, LegalPending],
  [ROUTES.TERMS, LegalPending],
])

export const MarketingPending = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const Page = MARKETING_PAGES.get(pathname)

  return (
    <div className="dark relative isolate min-h-svh bg-background text-foreground">
      <PageFrame />
      <Navigation />
      <main className="relative z-10">{Page && <Page />}</main>
    </div>
  )
}
