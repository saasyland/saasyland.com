import { isNotFound, notFound } from "@tanstack/react-router"
import { describe, expect, it } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

import { notFoundHead, recordHead, rethrowAsNotFound } from "~/src/lib/not-found"
import { ROBOTS, buildPageHead, buildTitle } from "~/src/lib/seo"

import enNotFoundMessages from "~/messages/en-US/errors.not-found.json"
import plNotFoundMessages from "~/messages/pl-PL/errors.not-found.json"
import { ROUTES } from "~/src/routes"

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

describe("recordHead", () => {
  const head = recordHead(ROUTES.ADMIN.USERS.INDEX)
  const RECORD = { locale: "pl-PL", pathname: `${ROUTES.ADMIN.USERS.INDEX}/ada`, title: "Ada Lovelace" } as const

  it("titles a record's page after the record", () => {
    expect(head({ loaderData: RECORD, match: { error: undefined } })).toStrictEqual(buildPageHead(RECORD))
  })

  it("points at the list until the record has loaded", () => {
    expect(head({ match: { error: undefined } })).toStrictEqual(buildPageHead({ pathname: ROUTES.ADMIN.USERS.INDEX }))
  })

  it("titles a record that does not exist as a page that was not found, and keeps it out of search results", async () => {
    await expect(head({ match: { error: notFound() } })).resolves.toStrictEqual({
      meta: [
        { title: buildTitle({ locale: "en-US", title: enNotFoundMessages.metadata.title }) },
        { content: enNotFoundMessages.metadata.description, name: "description" },
        { content: ROBOTS.NOINDEX, name: "robots" },
      ],
    })
  })
})
