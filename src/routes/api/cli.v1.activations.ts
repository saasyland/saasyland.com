import { createFileRoute } from "@tanstack/react-router"

import { licenseApiHandlers } from "~/src/modules/license/license.api"

export const Route = createFileRoute("/api/cli/v1/activations")({
  server: { handlers: { POST: licenseApiHandlers.activate } },
})
