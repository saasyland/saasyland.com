import { useSuspenseQuery } from "@tanstack/react-query"
import { Mail } from "lucide-react"

import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"

import type { BrowserArea } from "~/src/areas/browser"
import { DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

const NAMESPACES = ["auth.validations"] as const

export const NEWSLETTER_BROWSER = {
  dashboard: [
    {
      icon: Mail,
      key: "subscribers",
      order: 60,
      placement: DASHBOARD_PLACEMENT.STAT,
      prefetch: (queryClient) => queryClient.query({ ...newsletterSubscribersQuery, staleTime: "static" }),
      useValue: () => useSuspenseQuery(newsletterSubscribersQuery).data.total,
    },
  ],
  layoutNamespaces: [
    { layout: "/_site/_marketing", namespaces: NAMESPACES },
    { layout: "/_site/docs", namespaces: NAMESPACES },
  ],
  name: "newsletter",
} as const satisfies BrowserArea
