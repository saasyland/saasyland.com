import * as contract from "@saasyland/stack/api"
import { expect, it } from "vite-plus/test"

import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"

it("names exactly the tiers of the CLI licence API contract", () => {
  expect(LICENSE_TIER).toStrictEqual(contract.LICENSE_TIER)
  expect(LICENSE_TIERS.toSorted()).toStrictEqual(Object.values(contract.LICENSE_TIER).toSorted())
  expect(Object.keys(LICENSE_ACTIVATION_LIMITS).toSorted()).toStrictEqual(Object.values(contract.LICENSE_TIER).toSorted())
})
