import type { QueryClient } from "@tanstack/react-query"

export const settleQueries = async (queryClient: QueryClient): Promise<void> => {
  const fetching = queryClient.getQueryCache().findAll({ fetchStatus: "fetching" })
  if (fetching.length === 0) {
    return
  }
  await Promise.allSettled(
    fetching.map(async ({ promise }) => {
      await promise
    }),
  )
  await settleQueries(queryClient)
}
