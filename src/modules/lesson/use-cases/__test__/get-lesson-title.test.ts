import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LESSON_IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { LESSON_QUERY_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lessonTitleQuery } from "~/src/modules/lesson/use-cases/get-lesson-title"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getLessonTitle", () => {
  it("names a lesson and its course in every language they are written in", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeQuery(lessonTitleQuery({ lessonId: LESSON_IDS.PREVIEW }))).resolves.toStrictEqual({
      title: { course: { "en-US": "The walkthrough", "pl-PL": "Przewodnik" }, lesson: { "en-US": "Boundaries", "pl-PL": "Granice" } },
    })
    expect(lessonTitleQuery({ lessonId: LESSON_IDS.PREVIEW }).queryKey).toStrictEqual([
      ...LESSON_QUERY_KEYS.TITLE,
      { lessonId: LESSON_IDS.PREVIEW },
    ])
  })

  it("returns no title for a lesson that was deleted", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeQuery(lessonTitleQuery({ lessonId: MISSING_ID }))).resolves.toStrictEqual({ title: undefined })
  })

  it("rejects a caller without the permission to read courses", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeQuery(lessonTitleQuery({ lessonId: LESSON_IDS.PREVIEW }))).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})
