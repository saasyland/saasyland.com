import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vite-plus/test"

import { settleQueries } from "~/src/lib/settle-queries"

const SESSION_KEY = ["session"]
const LICENSE_KEY = ["license"]

const createClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const pendingFetch = (queryClient: QueryClient, queryKey: string[]) => {
  const response = Promise.withResolvers<string>()
  const fetching = queryClient.query({ queryFn: () => response.promise, queryKey }).catch(() => queryKey)
  return { fetching, response }
}

const NEXT_TASK_MS = 0

const nextTask = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, NEXT_TASK_MS)
  })
}

describe("settleQueries", () => {
  it("resolves at once when no query is fetching", async () => {
    expect.hasAssertions()

    await expect(settleQueries(createClient())).resolves.toBeUndefined()
  })

  it("waits for every fetch in flight, failed ones included, and for the ones they start", async () => {
    expect.hasAssertions()
    const queryClient = createClient()
    const session = pendingFetch(queryClient, SESSION_KEY)
    const license = pendingFetch(queryClient, LICENSE_KEY)

    let settled = false
    const settling = settleQueries(queryClient).then(() => {
      settled = true
    })
    session.response.resolve("admin")
    await session.fetching
    const refetch = pendingFetch(queryClient, SESSION_KEY)
    license.response.reject(new Error("refused"))
    await license.fetching
    await nextTask()

    expect(settled).toBe(false)

    refetch.response.resolve("customer")
    await refetch.fetching

    await settling

    expect(settled).toBe(true)
    expect(queryClient.isFetching()).toBe(0)
  })
})
