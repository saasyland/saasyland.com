import { AUTH_PAGES } from "./auth.pages"
import { BILLING_PAGES } from "./billing.pages"
import { CONTENT_PAGES } from "./content.pages"
import { COURSES_PAGES } from "./courses.pages"
import { LEGAL_PAGES } from "./legal.pages"
import { LICENSE_PAGES } from "./license.pages"
import { NEWSLETTER_PAGES } from "./newsletter.pages"
import { PAYMENTS_PAGES } from "./payments.pages"
import { PRODUCTS_PAGES } from "./products.pages"

export interface PageEntry {
  readonly heading?: string
  readonly path: string
  readonly role?: string
}

const ENTRIES: readonly PageEntry[] = [
  { path: "/" },
  { path: "/pl-PL" },
  ...AUTH_PAGES,
  ...BILLING_PAGES,
  ...CONTENT_PAGES,
  ...COURSES_PAGES,
  ...LEGAL_PAGES,
  ...LICENSE_PAGES,
  ...NEWSLETTER_PAGES,
  ...PAYMENTS_PAGES,
  ...PRODUCTS_PAGES,
]

export const PUBLIC_PAGES = ENTRIES.filter(({ role }) => role === undefined).map(({ path }) => path)

export const workspacePages = (role: string): readonly PageEntry[] => ENTRIES.filter((entry) => entry.role === role)
