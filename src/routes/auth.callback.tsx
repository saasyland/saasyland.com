import { createFileRoute } from "@tanstack/react-router"

import { redirectAfterAuth } from "~/src/integrations/better-auth/auth.routes"
import { authSearchSchema } from "~/src/integrations/better-auth/auth.zod"

export const Route = createFileRoute("/auth/callback")({
  validateSearch: authSearchSchema,
  beforeLoad: redirectAfterAuth,
})
