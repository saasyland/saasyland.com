import { type ComponentProps, createElement } from "react"

import { describe, expect, it } from "vite-plus/test"

import messages from "~/messages/en-US/emails.reset-password-email.json"
import { ResetPasswordEmail } from "~/src/presentation/emails/reset-password-email"

describe("reset password email template", () => {
  it("builds reset password email element tree", () => {
    expect.hasAssertions()
    const props: ComponentProps<typeof ResetPasswordEmail> = {
      locale: "en-US",
      messages,
      name: "User",
      resetPasswordUrl: "https://example.com/reset",
    }
    const element = createElement(ResetPasswordEmail, props)
    expect(element.props).toMatchObject(props)
  })
})
