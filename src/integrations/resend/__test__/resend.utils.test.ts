import { env } from "cloudflare:workers"

import { createElement } from "react"

import { createHash } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { sendBatchEmails, sendEmail } from "~/src/integrations/resend/resend.utils"

const PURPOSE = "sample-email"
const RECIPIENT = "ada@example.test"
const RESEND_IDEMPOTENCY_KEY_MAX_LENGTH = 256
const message = { react: createElement("p", null, "Hello"), subject: "Hello", to: RECIPIENT }

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex")

afterEach(() => {
  vi.restoreAllMocks()
})

describe("sendEmail", () => {
  it("keys the request on its purpose and a SHA-256 digest of the token, so a retry is not sent twice", async () => {
    const id = await sendEmail({ ...message, idempotency: { purpose: PURPOSE, token: "token-1" } })
    const retried = await sendEmail({ ...message, idempotency: { purpose: PURPOSE, token: "token-1" } })

    expect(retried).toBe(id)
    expect(getSentEmails(RECIPIENT)).toStrictEqual([expect.objectContaining({ id, idempotencyKey: `${PURPOSE}/${sha256("token-1")}` })])
  })

  it("stays within Resend's idempotency key limit however long the token is", async () => {
    const token = "x".repeat(RESEND_IDEMPOTENCY_KEY_MAX_LENGTH * 4)

    await sendEmail({ ...message, idempotency: { purpose: PURPOSE, token } })

    const [delivery] = getSentEmails(RECIPIENT)
    expect(delivery?.idempotencyKey).toBe(`${PURPOSE}/${sha256(token)}`)
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

    await expect(sendEmail({ ...message, idempotency: { purpose: PURPOSE, token: "token-4" } })).rejects.toThrow(
      `Failed to send "Hello" to ${RECIPIENT}: The domain is not verified.`,
    )
  })
})

describe("sendBatchEmails", () => {
  const batch = [
    { headers: { "X-Entity-Ref-ID": "first" }, react: createElement("p", null, "One"), subject: "One", to: "one@example.test" },
    { headers: {}, react: createElement("p", null, "Two"), subject: "Two", to: "two@example.test" },
  ]

  it("sends every email with its own headers in one request keyed on its purpose, so a retry is not sent twice", async () => {
    const ids = await sendBatchEmails({ emails: batch, idempotency: { purpose: PURPOSE, token: "batch-1" } })
    const retried = await sendBatchEmails({ emails: batch, idempotency: { purpose: PURPOSE, token: "batch-1" } })

    expect(retried).toStrictEqual(ids)
    expect(getSentEmails()).toStrictEqual([
      expect.objectContaining({
        from: env.RESEND_EMAIL_FROM,
        headers: { "X-Entity-Ref-ID": "first" },
        id: ids[0],
        idempotencyKey: `${PURPOSE}/${sha256("batch-1")}`,
        to: ["one@example.test"],
      }),
      expect.objectContaining({ headers: {}, id: ids[1], subject: "Two", to: ["two@example.test"] }),
    ])
  })

  it("sends the emails Resend accepts and logs the ones it refuses instead of failing the batch", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    const ids = await sendBatchEmails({
      emails: [...batch, { headers: {}, react: createElement("p", null, "Three"), subject: "Three", to: "not-an-address" }],
      idempotency: { purpose: PURPOSE, token: "batch-3" },
    })

    expect(ids).toHaveLength(2)
    expect(getSentEmails().map(({ to }) => to)).toStrictEqual([["one@example.test"], ["two@example.test"]])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`[resend] ${PURPOSE}: Resend refused email 2 of a batch:`))
  })

  it("throws with the purpose, the size of the batch and Resend's reason when Resend rejects it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ message: "Too many requests.", name: "rate_limit_exceeded", statusCode: 429 }, { status: 429 }),
    )

    await expect(
      sendBatchEmails({ emails: batch, from: "owner@example.test", idempotency: { purpose: PURPOSE, token: "batch-2" } }),
    ).rejects.toThrow(`Failed to send a batch of 2 emails for ${PURPOSE}: Too many requests.`)
  })
})
