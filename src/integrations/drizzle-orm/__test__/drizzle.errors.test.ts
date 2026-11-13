import { describe, expect, it } from "vite-plus/test"

import { rethrowAsConflict } from "~/src/integrations/drizzle-orm/drizzle.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

const UNIQUE_FAILURE = new Error("D1_ERROR: UNIQUE constraint failed: course.slug: SQLITE_CONSTRAINT")

describe("rethrowAsConflict", () => {
  it("turns a unique constraint failure in the error or any of its causes into a conflict", () => {
    expect(() => rethrowAsConflict(UNIQUE_FAILURE)).toThrow(ERROR_CODES.CONFLICT)
    expect(() => rethrowAsConflict(new Error("Failed query", { cause: new Error("wrapped", { cause: UNIQUE_FAILURE }) }))).toThrow(
      ERROR_CODES.CONFLICT,
    )
  })

  it("rethrows any other failure unchanged", () => {
    const failure = new Error("FOREIGN KEY constraint failed")

    expect(() => rethrowAsConflict(failure)).toThrow(failure)
    expect(() => rethrowAsConflict("UNIQUE constraint failed")).toThrow("UNIQUE constraint failed")
  })
})
