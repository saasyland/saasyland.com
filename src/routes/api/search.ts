import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { search } = await import("~/src/integrations/fumadocs/fumadocs.search")
        return search.GET(request)
      },
    },
  },
})
