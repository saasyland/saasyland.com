import { describe, expect, it } from "vite-plus/test"

import { nextClientAddress, postJson, signUp, verifyEmail } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { ROUTES } from "~/src/routes"

const SIGN_IN_ATTEMPTS_PER_WINDOW = 3

const signInWithWrongPassword = async (email: string, ip: string): Promise<number> => {
  const response = await auth.handler(
    postJson(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_IN_EMAIL}`, { email, password: "WrongPass1!" }, { ip }),
  )
  return response.status
}

describe("auth rate limiting", () => {
  it("answers 429 once one address has failed to sign in three times within the window, and only for that address", async () => {
    const account = await signUp()
    await verifyEmail(account.email)
    const attacker = nextClientAddress()

    const attempts = []
    for (let attempt = 0; attempt <= SIGN_IN_ATTEMPTS_PER_WINDOW; attempt++) {
      attempts.push(await signInWithWrongPassword(account.email, attacker))
    }
    const fromAnotherAddress = await signInWithWrongPassword(account.email, nextClientAddress())

    expect(attempts).toStrictEqual([
      ...Array.from({ length: SIGN_IN_ATTEMPTS_PER_WINDOW }, () => HTTP_STATUS.UNAUTHORIZED),
      HTTP_STATUS.TOO_MANY_REQUESTS,
    ])
    expect(fromAnotherAddress).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
