import { getRequest } from "@tanstack/react-start/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LESSON_IDS, USERS, recordProgress, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { completedLessonsQuery } from "~/src/modules/lesson-progress/use-cases/get-completed-lessons"

const PUBLISHED_LESSONS = [LESSON_IDS.PREVIEW, LESSON_IDS.ACCOUNT, LESSON_IDS.PAID, LESSON_IDS.PAID_WITHOUT_VIDEO].length

const signInAs = (userId: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ userId }))
}

beforeEach(async () => {
  vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/app"))
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getCompletedLessons", () => {
  it("counts the published lessons the learner has finished, out of every published lesson", async () => {
    await recordProgress({ completedAt: new Date(), lessonId: LESSON_IDS.PREVIEW, positionMs: 0, userId: USERS.ENTITLED })
    await recordProgress({ lessonId: LESSON_IDS.ACCOUNT, positionMs: 42_000, userId: USERS.ENTITLED })
    await recordProgress({ completedAt: new Date(), lessonId: LESSON_IDS.DRAFT, positionMs: 0, userId: USERS.ENTITLED })
    await recordProgress({ completedAt: new Date(), lessonId: LESSON_IDS.PAID, positionMs: 0, userId: USERS.VISITOR })
    signInAs(USERS.ENTITLED)

    await expect(executeQuery(completedLessonsQuery)).resolves.toStrictEqual({ completed: 1, total: PUBLISHED_LESSONS })
  })

  it("starts every learner at none", async () => {
    signInAs(USERS.VISITOR)

    await expect(executeQuery(completedLessonsQuery)).resolves.toStrictEqual({ completed: 0, total: PUBLISHED_LESSONS })
  })

  it("is for signed-in learners only", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())

    await expect(executeQuery(completedLessonsQuery)).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  })
})
