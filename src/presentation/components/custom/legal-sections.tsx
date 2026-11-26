import type { JSX, ReactNode } from "react"

import { Link } from "@tanstack/react-router"

import { REFUND_TERMS } from "~/src/data/refunds"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const LINK_CLASS =
  "text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

export const LegalLink = ({
  children,
  to,
}: {
  readonly children: ReactNode
  readonly to: typeof ROUTES.APP.LICENSE | typeof ROUTES.REFUNDS | typeof ROUTES.WITHDRAWAL
}): JSX.Element => (
  <Link className={LINK_CLASS} to={to}>
    {children}
  </Link>
)

export const WITHDRAWAL_TAGS = {
  days: REFUND_TERMS.WITHDRAWAL_DAYS,
  email: CONTACT_EMAIL,
  withdrawal: (chunks: ReactNode) => <LegalLink to={ROUTES.WITHDRAWAL}>{chunks}</LegalLink>,
}

export const LegalSection = ({ children, title }: { readonly children: ReactNode; readonly title: ReactNode }): JSX.Element => (
  <section className="flex flex-col gap-3">
    <h2 className="text-xl font-medium text-foreground">{title}</h2>
    <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{children}</p>
  </section>
)

export const LegalSections = ({
  children,
  lastUpdated,
}: {
  readonly children: ReactNode
  readonly lastUpdated: ReactNode
}): JSX.Element => (
  <>
    <p className="mt-6 text-spec text-muted-foreground">{lastUpdated}</p>
    <div className="mt-12 flex max-w-3xl flex-col gap-10">{children}</div>
  </>
)
