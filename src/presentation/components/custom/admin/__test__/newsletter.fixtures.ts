import type { QueryClient } from "@tanstack/react-query"

import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"

export const seedNewsletterQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(newsletterSubscribersQuery.queryKey, { total: 0 })
}
