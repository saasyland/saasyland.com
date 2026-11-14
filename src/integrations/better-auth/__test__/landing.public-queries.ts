import { vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { starCountQuery } from "~/src/lib/github"

export const LANDING_PUBLIC_QUERIES = {
  "src/lib/github.ts": () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ stargazers_count: 1 }))
    return executeQuery(starCountQuery)
  },
}
