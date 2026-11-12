import type { models } from "@polar-sh/sdk/2026-10"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

const LICENSE_KEY_ID = "lk_1"
const FULL_KEY = "SAASY-1111-2222-3333"

const ISSUED_AT = "2026-01-01T00:00:00.000Z"

export const POLAR_LICENSE_KEY: models.LicenseKeyWithActivations = {
  activations: [],
  benefit_id: "ben_1",
  created_at: ISSUED_AT,
  customer: {
    avatar_url: JSON_NULL,
    billing_address: JSON_NULL,
    billing_name: JSON_NULL,
    created_at: ISSUED_AT,
    deleted_at: JSON_NULL,
    email_verified: true,
    first_user_event_at: JSON_NULL,
    id: "cus_1",
    metadata: {},
    modified_at: JSON_NULL,
    name: JSON_NULL,
    organization_id: "org_1",
    tax_id: JSON_NULL,
    type: "individual",
  },
  customer_id: "cus_1",
  display_key: "****-3333",
  expires_at: JSON_NULL,
  id: LICENSE_KEY_ID,
  key: FULL_KEY,
  last_validated_at: JSON_NULL,
  limit_activations: JSON_NULL,
  limit_usage: JSON_NULL,
  member: JSON_NULL,
  member_id: JSON_NULL,
  modified_at: JSON_NULL,
  organization_id: "org_1",
  status: "granted",
  usage: 0,
  validations: 0,
}
