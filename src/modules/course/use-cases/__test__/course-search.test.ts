import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { IDS, LESSON_IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { searchCoursesQuery } from "~/src/modules/course/use-cases/search-courses"
import { searchLessonsQuery } from "~/src/modules/lesson/use-cases/search-lessons"

import { ROUTES } from "~/src/routes"

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("searchCourses", () => {
  it("finds a course by its title in any language or by its slug and names it in the admin's language", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const walkthrough = { detail: "the-walkthrough", id: IDS.COURSE, to: `${ROUTES.ADMIN.COURSES.INDEX}/${IDS.COURSE}` }

    await expect(executeQuery(searchCoursesQuery({ locale: "pl-PL", text: "walkthrough" }))).resolves.toStrictEqual([
      { ...walkthrough, title: "Przewodnik" },
    ])
    await expect(executeQuery(searchCoursesQuery({ locale: "en-US", text: "PRZEWOD" }))).resolves.toStrictEqual([
      { ...walkthrough, title: "The walkthrough" },
    ])
    await expect(executeQuery(searchCoursesQuery({ locale: "en-US", text: "one-off" }))).resolves.toHaveLength(1)
  })

  it("never matches the language codes the titles are stored under", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeQuery(searchCoursesQuery({ locale: "en-US", text: "en-US" }))).resolves.toStrictEqual([])
  })

  it("refuses a caller who may not read courses", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeQuery(searchCoursesQuery({ locale: "en-US", text: "walk" }))).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("searchLessons", () => {
  it("finds a lesson by its title in any language or its slug, names its course and links to its editor", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeQuery(searchLessonsQuery({ locale: "pl-PL", text: "granice" }))).resolves.toStrictEqual([
      {
        detail: "Przewodnik",
        id: LESSON_IDS.PREVIEW,
        title: "Granice",
        to: `${ROUTES.ADMIN.COURSES.INDEX}/${IDS.COURSE}/lessons/${LESSON_IDS.PREVIEW}`,
      },
    ])
    await expect(executeQuery(searchLessonsQuery({ locale: "en-US", text: "billing" }))).resolves.toMatchObject([
      { detail: "The walkthrough", id: LESSON_IDS.PAID, title: "Billing" },
    ])
  })

  it("refuses a caller who may not read courses", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeQuery(searchLessonsQuery({ locale: "en-US", text: "billing" }))).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})
