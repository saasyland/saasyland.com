import { describe, expect, it, vi } from "vite-plus/test"

import { translateValidationMessage } from "~/src/integrations/use-intl/validation-messages"

describe("translate validation message", () => {
  it("uses a translated fallback for unknown validation messages", () => {
    const t = vi.fn<(key: string) => string>((key) => key)
    expect(translateValidationMessage({ message: "Unexpected database details", namespace: "auth.validations" }, t)).toBe(
      "errors.action.VALIDATION",
    )
  })

  it("returns the translation key when no params are configured", () => {
    expect.hasAssertions()

    const t = vi.fn<(key: string) => string>((key) => key)

    expect(translateValidationMessage({ message: "nameRequired", namespace: "auth.validations" }, t)).toBe("auth.validations.nameRequired")
  })

  it("passes interpolation params to the translator", () => {
    expect.hasAssertions()

    const t = vi.fn<(key: string, values?: Record<string, string | number>) => string>((key, values) => `${key}:${JSON.stringify(values)}`)

    expect(
      translateValidationMessage({ message: "nameMaxLength", namespace: "auth.validations" }, t, { nameMaxLength: { max: 255 } }),
    ).toBe('auth.validations.nameMaxLength:{"max":255}')
    expect(t).toHaveBeenCalledWith("auth.validations.nameMaxLength", { max: 255 })
  })
})
