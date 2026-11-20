import { API_AUTH_BASE } from "~/src/data/auth.routes"

export const API_AUTH_POLAR = {
  CUSTOMER: "/customer/",
  CUSTOMER_PORTAL: "/customer/portal",
  WEBHOOKS: "/polar/webhooks",
} as const
export const API_AUTH_CUSTOMER_PORTAL = `${API_AUTH_BASE}${API_AUTH_POLAR.CUSTOMER_PORTAL}`
