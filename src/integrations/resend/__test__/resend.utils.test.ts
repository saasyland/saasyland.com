import { env } from "cloudflare:workers"

import { createElement } from "react"

import { createHash } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { clearSentEmails, getSentEmails, respondAsResend } from "~/src/platform/testing/mocks/providers"

import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import { sendEmail } from "~/src/integrations/resend/resend.utils"

const RECIPIENT = "ada@example.test"
const RESEND_IDEMPOTENCY_KEY_MAX_LENGTH = 256
const message = { react: createElement("p", null, "Hello"), subject: "Hello", to: RECIPIENT }

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex")

beforeEach(() => {
  clearSentEmails()
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => respondAsResend(new Request(input, init)))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("sendEmail", () => {
  it("keys the request on its purpose and a SHA-256 digest of the token, so a retry is not sent twice", async () => {
    const id = await sendEmail({ ...message, idempotency: { purpose: EMAIL_PURPOSE.VERIFY_EMAIL, token: "token-1" } })

    expect(getSentEmails(RECIPIENT)).toStrictEqual([
      expect.objectContaining({ id, idempotencyKey: `${EMAIL_PURPOSE.VERIFY_EMAIL}/${sha256("token-1")}` }),
    ])
  })

  it("stays within Resend's idempotency key limit however long the token is", async () => {
    const token = "x".repeat(RESEND_IDEMPOTENCY_KEY_MAX_LENGTH * 4)

    await sendEmail({ ...message, idempotency: { purpose: EMAIL_PURPOSE.CHANGE_EMAIL_CONFIRMATION, token } })

    const [delivery] = getSentEmails(RECIPIENT)
    expect(delivery?.idempotencyKey).toBe(`${EMAIL_PURPOSE.CHANGE_EMAIL_CONFIRMATION}/${sha256(token)}`)
    expect(delivery?.idempotencyKey?.length).toBeLessThanOrEqual(RESEND_IDEMPOTENCY_KEY_MAX_LENGTH)
  })

  it("sends from RESEND_EMAIL_FROM unless another sender is given", async () => {
    await sendEmail({ ...message, idempotency: { purpose: "default-sender", token: "token-2" } })
    await sendEmail({ ...message, from: "owner@example.test", idempotency: { purpose: "custom-sender", token: "token-3" } })

    expect(getSentEmails(RECIPIENT).map(({ from }) => from)).toStrictEqual([env.RESEND_EMAIL_FROM, "owner@example.test"])
  })

  it("throws with the subject, recipient and Resend's reason when Resend rejects the email", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ message: "The domain is not verified.", name: "validation_error", statusCode: 403 }, { status: 403 }),
    )

    await expect(sendEmail({ ...message, idempotency: { purpose: EMAIL_PURPOSE.VERIFY_EMAIL, token: "token-4" } })).rejects.toThrow(
      `Failed to send "Hello" to ${RECIPIENT}: The domain is not verified.`,
    )
  })
})
