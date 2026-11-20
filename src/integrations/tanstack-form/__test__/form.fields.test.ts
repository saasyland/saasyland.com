import { describe, expect, it, vi } from "vite-plus/test"

import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"

const fieldWith = (isBlurred: boolean, isValid: boolean) => ({ state: { meta: { isBlurred, isValid } } })

it("extracts the first form error from strings and validation issues", () => {
  expect(fieldErrorMessage(["Required", "Other"])).toBe("Required")
  expect(fieldErrorMessage([{ message: "Invalid email" }])).toBe("Invalid email")
})
it("ignores unrecognized and missing errors", () => {
  for (const errors of [[], [null], [42], [{}], [{ message: 42 }]]) {
    expect(fieldErrorMessage(errors)).toBeUndefined()
  }
})

describe("field error timing", () => {
  it("keeps an invalid field quiet while the visitor is still in it", () => {
    expect(isFieldInvalid(fieldWith(false, false))).toBe(false)
  })

  it("shows the error once the visitor has left the field or tried to submit", () => {
    expect(isFieldInvalid(fieldWith(true, false))).toBe(true)
  })

  it("never marks a valid field invalid", () => {
    expect(isFieldInvalid(fieldWith(true, true))).toBe(false)
    expect(isFieldInvalid(fieldWith(false, true))).toBe(false)
  })

  it("validates a field with the change validator when the visitor leaves it", () => {
    const validate = vi.fn<(cause: string) => unknown>()

    validateOnBlur({ fieldApi: { validate } })

    expect(validate).toHaveBeenCalledExactlyOnceWith("change")
  })
})
