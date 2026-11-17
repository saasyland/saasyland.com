import type { getRouter } from "~/src/router"

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
    server: { requestContext: { nonce: string } }
  }
  interface StaticDataRouteOption {
    dark?: boolean
    namespaces?: readonly string[]
    underHeader?: boolean
  }
}
