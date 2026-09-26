import { createFileRoute } from "@tanstack/react-router"

import { search } from "~/src/integrations/fumadocs/fumadocs.search"

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: ({ request }) => search.GET(request),
    },
  },
})
