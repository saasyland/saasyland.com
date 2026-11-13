import { notFound } from "@tanstack/react-router"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

export const rethrowAsNotFound = (error: unknown): never => {
  if (error instanceof Error && error.message === ERROR_CODES.NOT_FOUND) {
    throw notFound()
  }

  throw error
}
