import { type ComponentProps, createElement } from "react"

import { describe, expect, it } from "vite-plus/test"

import messages from "~/messages/en-US/emails.verify-email.json"
import { VerifyEmail } from "~/src/presentation/emails/verify-email"

describe("verify email template", () => {
  it("builds verification email element tree", () => {
    expect.hasAssertions()
    const props: ComponentProps<typeof VerifyEmail> = {
      locale: "en-US",
      messages,
      name: "User",
      verifyUrl: "https://example.com/verify",
    }
    const element = createElement(VerifyEmail, props)
    expect(element.props).toMatchObject(props)
  })
})
