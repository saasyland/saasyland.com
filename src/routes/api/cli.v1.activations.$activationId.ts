import { createFileRoute } from "@tanstack/react-router"

import { licenseApiHandlers } from "~/src/modules/license/license.api"

export const Route = createFileRoute("/api/cli/v1/activations/$activationId")({
  server: { handlers: { DELETE: licenseApiHandlers.deactivate, GET: licenseApiHandlers.validate } },
})
