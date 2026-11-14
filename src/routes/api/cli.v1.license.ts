import { createFileRoute } from "@tanstack/react-router"

import { licenseApiHandlers } from "~/src/modules/license/license.api"

export const Route = createFileRoute("/api/cli/v1/license")({
  server: { handlers: { GET: licenseApiHandlers.license } },
})
