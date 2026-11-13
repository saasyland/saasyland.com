import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

const UNIQUE_VIOLATION = "UNIQUE constraint failed"

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Error && (error.message.includes(UNIQUE_VIOLATION) || isUniqueViolation(error.cause))

export const rethrowAsConflict = (error: unknown): never => {
  if (isUniqueViolation(error)) {
    throw new AppError(ERROR_CODES.CONFLICT)
  }

  throw error
}
