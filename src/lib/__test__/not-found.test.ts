import { isNotFound } from "@tanstack/react-router"
import { describe, expect, it } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

import { notFoundHead, rethrowAsNotFound } from "~/src/lib/not-found"
import { ROBOTS, buildTitle } from "~/src/lib/seo"

import plNotFoundMessages from "~/messages/pl-PL/errors.not-found.json"

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

  it.each([new AppError(ERROR_CODES.FORBIDDEN), ERROR_CODES.NOT_FOUND])("rethrows anything else unchanged", (error) => {
    expect(thrown(error)).toBe(error)
  })
})

describe("notFoundHead", () => {
  it("titles the page in the visitor's locale and keeps it out of search results", async () => {
    await expect(notFoundHead("pl-PL")).resolves.toStrictEqual({
      meta: [
        { title: buildTitle({ locale: "pl-PL", title: plNotFoundMessages.metadata.title }) },
        { content: plNotFoundMessages.metadata.description, name: "description" },
        { content: ROBOTS.NOINDEX, name: "robots" },
      ],
    })
  })
})
