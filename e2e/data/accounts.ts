import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"

export const TEST_PASSWORD = "WorkerTestPassword123!"
export const TEST_ACCOUNTS = [
  { email: "admin@example.test", id: "test-admin", name: "Test Admin", role: ROLE_CODES.ADMIN },
  { email: "customer@example.test", id: "test-customer", name: "Test Customer", role: ROLE_CODES.CUSTOMER },
] as const
