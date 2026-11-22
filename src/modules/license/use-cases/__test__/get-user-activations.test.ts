import { PLATFORM } from "@saasyland/stack/api"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"
import { activatePolarLicenseKey, createPolarOrder, grantPolarLicenseKey, polarLicenseKeyOf } from "~/src/platform/testing/mocks/polar"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"
import {
  LICENSE_ACTIVATIONS_STALE_MS,
  LICENSE_ACTIVATIONS_TIMEOUT_SECONDS,
  LICENSE_ACTIVATION_LIMITS,
  LICENSE_MACHINES,
  LICENSE_QUERY_KEYS,
  LICENSE_TIER,
} from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { userActivationsQuery } from "~/src/modules/license/use-cases/get-user-activations"
import { user } from "~/src/modules/user/user.schema"

const ADMIN_ID = "01900000-0000-7000-8000-000000000021"
const BUYER_ID = "01900000-0000-7000-8000-000000000022"
const AWAITING_KEY_ID = "01900000-0000-7000-8000-000000000023"
const VISITOR_ID = "01900000-0000-7000-8000-000000000024"
const FIRST_ACTIVATION = new Date("2026-11-12T09:00:00.000Z")
const SECOND_ACTIVATION = new Date("2026-11-13T09:00:00.000Z")

const grantKey = () => {
  const order = createPolarOrder({ externalCustomerId: BUYER_ID, productId: POLAR_PRODUCT_IDS[LICENSE_TIER.CORE] })
  const grant = grantPolarLicenseKey(order)
  vi.setSystemTime(SECOND_ACTIVATION)
  const runner = activatePolarLicenseKey(grant, "CI runner", { platform: PLATFORM.LINUX })
  vi.setSystemTime(FIRST_ACTIVATION)
  const mac = activatePolarLicenseKey(grant, "Studio Mac", { platform: PLATFORM.MACOS })
  const laptop = activatePolarLicenseKey(grant, "Old laptop", { platform: "beos" })

  return { ids: { laptop: laptop.id, mac: mac.id, runner: runner.id }, polarLicenseKeyId: polarLicenseKeyOf(grant).id }
}

const insertLicences = async (polarLicenseKeyId: string): Promise<void> => {
  await db.insert(license).values([
    { id: "buyer-license", polarCustomerId: "cus_buyer", polarLicenseKeyId, tier: LICENSE_TIER.CORE, userId: BUYER_ID },
    { id: "awaiting-license", polarCustomerId: "cus_awaiting", tier: LICENSE_TIER.AGENCY, userId: AWAITING_KEY_ID },
  ])
}

beforeEach(async () => {
  vi.useFakeTimers({ now: FIRST_ACTIVATION, toFake: ["Date"] })
  await db.delete(user)
  await db.insert(user).values([
    { email: "admin@example.test", id: ADMIN_ID, name: "Admin", role: ROLE_CODES.ADMIN },
    { email: "buyer@example.test", id: BUYER_ID, name: "Buyer", role: ROLE_CODES.CUSTOMER },
    { email: "awaiting@example.test", id: AWAITING_KEY_ID, name: "Awaiting", role: ROLE_CODES.CUSTOMER },
    { email: "visitor@example.test", id: VISITOR_ID, name: "Visitor", role: ROLE_CODES.CUSTOMER },
  ])
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_ID }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("get-user-activations", () => {
  it("lists each licensed account's machines from Polar, oldest first with their system, and its machine limit", async () => {
    const { ids, polarLicenseKeyId } = grantKey()
    await insertLicences(polarLicenseKeyId)

    const { machines } = await executeQuery(userActivationsQuery({ userIds: [BUYER_ID, AWAITING_KEY_ID, VISITOR_ID] }))

    expect(machines.toSorted((first, second) => first.userId.localeCompare(second.userId))).toStrictEqual([
      {
        activations: [
          { createdAt: FIRST_ACTIVATION, id: ids.mac, label: "Studio Mac", platform: PLATFORM.MACOS },
          { createdAt: FIRST_ACTIVATION, id: ids.laptop, label: "Old laptop", platform: undefined },
          { createdAt: SECOND_ACTIVATION, id: ids.runner, label: "CI runner", platform: PLATFORM.LINUX },
        ],
        limit: LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE],
        state: LICENSE_MACHINES.LISTED,
        userId: BUYER_ID,
      },
      { state: LICENSE_MACHINES.NO_KEY, userId: AWAITING_KEY_ID },
    ])
  })

  it("asks Polar with a short timeout and says Polar is unavailable when it cannot answer", async () => {
    await insertLicences("lk_unknown")
    const read = vi.spyOn(polar.licenseKeys, "get")

    await expect(executeQuery(userActivationsQuery({ userIds: [BUYER_ID] }))).resolves.toStrictEqual({
      machines: [{ state: LICENSE_MACHINES.UNAVAILABLE, userId: BUYER_ID }],
    })
    expect(read).toHaveBeenCalledWith("lk_unknown", { timeout: LICENSE_ACTIVATIONS_TIMEOUT_SECONDS })
  })

  it("keeps the answer for a minute and reads at most one page of accounts at a time", async () => {
    const query = userActivationsQuery({ userIds: [BUYER_ID] })
    const tooMany = Array.from({ length: DEFAULT_PAGE_SIZE + 1 }, (_, index) => String(index))

    expect(query.staleTime).toBe(LICENSE_ACTIVATIONS_STALE_MS)
    expect(query.queryKey).toStrictEqual([...LICENSE_QUERY_KEYS.USER_ACTIVATIONS, { userIds: [BUYER_ID] }])
    await expect(executeQuery(userActivationsQuery({ userIds: [] }))).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    await expect(executeQuery(userActivationsQuery({ userIds: tooMany }))).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
  })

  it("rejects a caller without the permission to read users", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: BUYER_ID }))

    await expect(executeQuery(userActivationsQuery({ userIds: [BUYER_ID] }))).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})
