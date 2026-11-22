import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"

export const licenseRow = (overrides: Partial<License["select"]> = {}): License["select"] => ({
  activatedAt: null,
  createdAt: new Date("2026-09-08T10:00:00Z"),
  deliveredAt: null,
  id: "license-1",
  key: "key",
  lessonOpenedAt: null,
  openedLessonId: null,
  polarCustomerId: "customer-1",
  polarLicenseKeyId: "polar-license-1",
  polarOrderId: "order-1",
  purchaseCreatedAt: new Date(0),
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.CORE,
  updatedAt: new Date("2026-09-08T10:00:00Z"),
  userId: "user-1",
  withdrawalConsentAt: null,
  ...overrides,
})
