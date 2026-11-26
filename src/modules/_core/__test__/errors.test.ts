import { describe, expect, it } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

const AUTH_ERROR_KEY = "accountNotLinked"

describe("app error", () => {
  it("carries the code and message", () => {
    expect.hasAssertions()
    const error = new AppError(ERROR_CODES.AUTH_API_ERROR, AUTH_ERROR_KEY)
    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe(ERROR_CODES.AUTH_API_ERROR)
    expect(error.message).toBe(AUTH_ERROR_KEY)
    expect(error.name).toBe("AppError")
  })

  it("defaults the message to the code", () => {
    expect.hasAssertions()
    expect(new AppError(ERROR_CODES.UNAUTHORIZED).message).toBe(ERROR_CODES.UNAUTHORIZED)
    expect(new AppError(ERROR_CODES.FORBIDDEN).message).toBe(ERROR_CODES.FORBIDDEN)
  })

  it("exposes one catalog of error codes", () => {
    expect.hasAssertions()
    expect(Object.values(ERROR_CODES)).toStrictEqual([
      "AUTH_API_ERROR",
      "CONFLICT",
      "FORBIDDEN",
      "INTERNAL_ERROR",
      "NOT_FOUND",
      "TOO_MANY_REQUESTS",
      "UNAUTHORIZED",
      "VALIDATION",
    ])
  })
})
