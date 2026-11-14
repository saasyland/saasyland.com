import { ROLE_CODES } from "../../src/integrations/better-auth/auth.access"

export const TEST_PASSWORD = "WorkerTestPassword123!"
export const TEST_ACCOUNTS = [
  { email: "admin@saasyland.example.test", id: "test-admin", name: "Test Admin", role: ROLE_CODES.ADMIN },
  { email: "customer@saasyland.example.test", id: "test-customer", name: "Test Customer", role: ROLE_CODES.CUSTOMER },
] as const

export const TEST_LICENSED_ACCOUNT = {
  email: "licensed@saasyland.example.test",
  id: "test-licensed",
  name: "Test Licensee",
  role: ROLE_CODES.CUSTOMER,
} as const
