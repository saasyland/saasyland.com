import { describe, expect, it } from "vite-plus/test"

import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"

describe("EMAIL_PURPOSE", () => {
  it("gives every email the areas send a purpose of its own", () => {
    const purposes = Object.values(EMAIL_PURPOSE)

    expect(new Set(purposes).size).toBe(purposes.length)
  })
})
