import { isNotFound } from "@tanstack/react-router"
import { describe, expect, it } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

import { rethrowAsNotFound } from "~/src/lib/not-found"

const thrown = (input: unknown): unknown => {
  try {
    rethrowAsNotFound(input)
  } catch (error) {
    return error
  }
  throw new Error("rethrowAsNotFound returned")
}

describe("rethrowAsNotFound", () => {
  it("turns a missing record into the router's not-found", () => {
    const error = thrown(new AppError(ERROR_CODES.NOT_FOUND))

    expect(isNotFound(error)).toBe(true)
  })

  it.each([new AppError(ERROR_CODES.FORBIDDEN), "NOT_FOUND"])("rethrows anything else unchanged", (error) => {
    expect(thrown(error)).toBe(error)
  })
})
