import { useSuspenseQuery } from "@tanstack/react-query"

import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"

import { type AdminDashboardStat, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

const AREA = "newsletter"

export const NEWSLETTER_DASHBOARD = [
  {
    area: AREA,
    key: "subscribers",
    order: 60,
    placement: DASHBOARD_PLACEMENT.STAT,
    prefetch: (queryClient) => queryClient.query({ ...newsletterSubscribersQuery, staleTime: "static" }),
    useValue: () => useSuspenseQuery(newsletterSubscribersQuery).data.total,
  },
] as const satisfies readonly AdminDashboardStat[]
