import { env, waitUntil } from "cloudflare:workers"

import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { APP_GITHUB_OWNER, APP_GITHUB_REPO } from "~/src/presentation/branding"

const CACHE_KEY = `github:${APP_GITHUB_OWNER}/${APP_GITHUB_REPO}:stars`
const REFRESH_AFTER_MS = 3_600_000
const FETCH_TIMEOUT_MS = 3000

const starCountSchema = z.int().nonnegative()
const cachedStarCountSchema = z.object({ count: starCountSchema, fetchedAt: z.int().nonnegative() })
const repositorySchema = z.object({ stargazers_count: starCountSchema })

const fetchStarCount = async (): Promise<number> => {
  const credentials = btoa(`${env.AUTH_GITHUB_CLIENT_ID}:${env.AUTH_GITHUB_CLIENT_SECRET}`)

  const response = await fetch(`https://api.github.com/repos/${APP_GITHUB_OWNER}/${APP_GITHUB_REPO}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Basic ${credentials}`,
      "user-agent": APP_GITHUB_REPO,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`GitHub repository request failed (${response.status})`)
  }

  const { stargazers_count: count } = repositorySchema.parse(await response.json())
  const entry = JSON.stringify({ count, fetchedAt: Date.now() })

  waitUntil(env.CACHE.put(CACHE_KEY, entry))

  return count
}

export const getStarCount = createServerFn({ method: "GET" }).handler(async () => {
  const cached = cachedStarCountSchema.safeParse(await env.CACHE.get(CACHE_KEY, "json")).data

  if (cached === undefined) {
    return fetchStarCount()
  }

  if (Date.now() - cached.fetchedAt >= REFRESH_AFTER_MS) {
    waitUntil(fetchStarCount())
  }

  return cached.count
})

export const starCountQuery = queryOptions({
  gcTime: REFRESH_AFTER_MS,
  queryFn: () => getStarCount(),
  queryKey: ["github", "stars"],
  staleTime: REFRESH_AFTER_MS,
})
