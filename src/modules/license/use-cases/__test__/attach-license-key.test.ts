import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createPolarOrder, grantPolarLicenseKey, polarLicenseKeyOf } from "~/src/platform/testing/mocks/polar"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { attachLicenseKey } from "~/src/modules/license/use-cases/attach-license-key"
import { getLicense } from "~/src/modules/license/use-cases/get-license"
import { grantLicense } from "~/src/modules/license/use-cases/grant-license"
import { revokeLicense } from "~/src/modules/license/use-cases/revoke-license"
import { user } from "~/src/modules/user/user.schema"

const USER_ID = "key-owner"
const A_DAY_MS = 86_400_000

const createdAt = (offsetMs: number): string => new Date(Date.now() + offsetMs).toISOString()

const purchase = () => {
  const order = createPolarOrder({ externalCustomerId: USER_ID, tier: LICENSE_TIER.CORE })
  const licenseKey = polarLicenseKeyOf(grantPolarLicenseKey(order))
  return {
    grant: { polarLicenseKeyId: licenseKey.id, polarOrderId: order.id, userId: USER_ID },
    licenseKey,
    paid: {
      polarCustomerId: order.customer_id,
      polarOrderId: order.id,
      purchaseCreatedAt: new Date(order.created_at),
      tier: LICENSE_TIER.CORE,
      userId: USER_ID,
    },
  }
}

beforeEach(async () => {
  await db.delete(user)
  await db.insert(user).values({ email: "key@example.test", id: USER_ID, name: "Buyer" })
})
afterEach(() => vi.restoreAllMocks())

describe("attach-license-key", () => {
  it("rejects an early grant and attaches its retry after the order arrives", async () => {
    const { grant, licenseKey, paid } = purchase()

    await expect(attachLicenseKey(grant)).rejects.toThrow("The license purchase has not been recorded yet")
    await grantLicense(paid)
    await attachLicenseKey(grant)

    expect(await getLicense(USER_ID)).toMatchObject({ key: licenseKey.key, polarLicenseKeyId: licenseKey.id })
  })

  it("waits for a newer order instead of attaching its key to the old purchase", async () => {
    const { paid } = purchase()
    await grantLicense(paid)
    const newer = createPolarOrder({ externalCustomerId: USER_ID, tier: LICENSE_TIER.COMPLETE }, { created_at: createdAt(A_DAY_MS) })
    const { id: newerKeyId } = polarLicenseKeyOf(grantPolarLicenseKey(newer))

    await expect(attachLicenseKey({ polarLicenseKeyId: newerKeyId, polarOrderId: newer.id, userId: USER_ID })).rejects.toThrow(
      "The license purchase has not been recorded yet",
    )
    expect(await getLicense(USER_ID)).toMatchObject({ key: null, polarOrderId: paid.polarOrderId })
  })

  it("ignores older grants and grants for a revoked purchase", async () => {
    const { grant, paid } = purchase()
    await grantLicense(paid)
    const older = createPolarOrder({ externalCustomerId: USER_ID, tier: LICENSE_TIER.CORE }, { created_at: createdAt(-A_DAY_MS) })
    const { id: olderKeyId } = polarLicenseKeyOf(grantPolarLicenseKey(older))

    await attachLicenseKey({ polarLicenseKeyId: olderKeyId, polarOrderId: older.id, userId: USER_ID })
    await revokeLicense({ polarOrderId: paid.polarOrderId, userId: USER_ID })
    const polarRequests = vi.spyOn(globalThis, "fetch")
    await attachLicenseKey(grant)

    expect(polarRequests).not.toHaveBeenCalled()
    expect(await getLicense(USER_ID)).toMatchObject({ key: null, status: LICENSE_STATUS.REVOKED })
  })

  it("acknowledges the key of a purchase refunded before it was recorded, without asking Polar for the order", async () => {
    const { grant } = purchase()
    await revokeLicense({ polarOrderId: grant.polarOrderId, userId: USER_ID })
    const polarRequests = vi.spyOn(globalThis, "fetch")

    await expect(attachLicenseKey(grant)).resolves.toBeUndefined()

    expect(polarRequests).not.toHaveBeenCalled()
    expect(await getLicense(USER_ID)).toBeUndefined()
  })

  it("acknowledges and logs a key granted for an order that is not a license purchase", async () => {
    const order = createPolarOrder({ externalCustomerId: USER_ID, tier: LICENSE_TIER.CORE }, { product_id: crypto.randomUUID() })
    const { id: licenseKeyId } = polarLicenseKeyOf(grantPolarLicenseKey(order, LICENSE_TIER.CORE))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(attachLicenseKey({ polarLicenseKeyId: licenseKeyId, polarOrderId: order.id, userId: USER_ID })).resolves.toBeUndefined()

    expect(consoleError).toHaveBeenCalledWith(
      `[license] license key ${licenseKeyId} was granted for order ${order.id}, which is not a license purchase`,
    )
    expect(await getLicense(USER_ID)).toBeUndefined()
  })

  it("acknowledges a key for an order without a product", async () => {
    const order = createPolarOrder({ externalCustomerId: USER_ID, tier: LICENSE_TIER.CORE }, { product: null, product_id: null })
    const { id: licenseKeyId } = polarLicenseKeyOf(grantPolarLicenseKey(order, LICENSE_TIER.CORE))
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(attachLicenseKey({ polarLicenseKeyId: licenseKeyId, polarOrderId: order.id, userId: USER_ID })).resolves.toBeUndefined()
    expect(await getLicense(USER_ID)).toBeUndefined()
  })
})
