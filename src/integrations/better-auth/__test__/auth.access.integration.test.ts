import { describe, expect, it } from "vite-plus/test"

import { findUser, promoteToAdmin, signUpAndVerify } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { DEFAULT_ROLE_CODE, ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"

describe("auth.access integration", () => {
  it("assigns the customer role by default after verification", async () => {
    const { headers } = await signUpAndVerify()

    const session = await auth.api.getSession({ headers })

    expect(session?.user.role).toBe(DEFAULT_ROLE_CODE)
  })

  it("allows admins to manage products through Better Auth permission checks", async () => {
    const { headers, userId } = await signUpAndVerify()
    await promoteToAdmin(userId)

    const permission = await auth.api.userHasPermission({ body: { permissions: { product: ["create"] }, role: ROLE_CODES.ADMIN }, headers })

    expect(permission.success).toBe(true)
  })

  it("denies customers product mutations through Better Auth permission checks", async () => {
    const { headers } = await signUpAndVerify()

    const permission = await auth.api.userHasPermission({
      body: { permissions: { product: ["create"] }, role: ROLE_CODES.CUSTOMER },
      headers,
    })

    expect(permission.success).toBe(false)
  })

  it("lets admins change another user's role", async () => {
    const admin = await signUpAndVerify()
    await promoteToAdmin(admin.userId)
    const target = await signUpAndVerify()

    await auth.api.setRole({ body: { role: ROLE_CODES.ADMIN, userId: target.userId }, headers: admin.headers })

    await expect(findUser(target.account.email)).resolves.toMatchObject({ role: ROLE_CODES.ADMIN })
  })

  it("refuses a role change requested by a customer", async () => {
    const customer = await signUpAndVerify()
    const target = await signUpAndVerify()

    await expect(auth.api.setRole({ body: { role: ROLE_CODES.ADMIN, userId: target.userId }, headers: customer.headers })).rejects.toThrow(
      "You are not allowed to change users role",
    )
    await expect(findUser(target.account.email)).resolves.toMatchObject({ role: DEFAULT_ROLE_CODE })
  })
})
