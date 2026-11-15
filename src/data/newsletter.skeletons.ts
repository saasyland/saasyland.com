import type { PageSkeleton } from "~/src/data/skeletons"

import { NewsletterPending } from "~/src/presentation/components/custom/newsletter-pending"

import { ROUTES } from "~/src/routes"

export const NEWSLETTER_SKELETONS = [
  { pendingComponent: NewsletterPending, to: ROUTES.NEWSLETTER_CONFIRM },
  { pendingComponent: NewsletterPending, to: ROUTES.NEWSLETTER_UNSUBSCRIBE },
] as const satisfies readonly PageSkeleton[]
