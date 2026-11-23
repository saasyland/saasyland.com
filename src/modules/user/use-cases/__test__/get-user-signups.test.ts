import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { userSignupsQuery } from "~/src/modules/user/use-cases/get-user-signups"
import { user } from "~/src/modules/user/user.schema"

import { TIME_BUCKET, TIME_RANGE } from "~/src/lib/time-series"

const NOW = new Date("2026-11-20T15:00:00.000Z")

const SIGNUPS = [
  "2026-11-20T08:00:00.000Z",
  "2026-11-20T09:00:00.000Z",
  "2026-11-14T00:00:00.000Z",
  "2026-11-13T23:59:59.999Z",
  "2026-06-02T12:00:00.000Z",
  "2025-11-30T12:00:00.000Z",
]

const valueOn = (points: readonly { readonly start: Date; readonly value: number }[], start: string): number | undefined =>
  points.find((point) => point.start.toISOString() === start)?.value

beforeEach(async () => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  await db.delete(user)
  await db.insert(user).values(
    SIGNUPS.map((createdAt, index) => ({
      createdAt: new Date(createdAt),
      email: `signup${index}@example.test`,
      id: `signup-${index}`,
      name: "Signup",
    })),
  )
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("get-user-signups", () => {
  it("counts the accounts created on each of the last 7 UTC days", async () => {
    const { bucket, points, total } = await executeQuery(userSignupsQuery({ range: TIME_RANGE.LAST_7_DAYS }))

    expect(bucket).toBe(TIME_BUCKET.DAY)
    expect(total).toBe(3)
    expect(points.map(({ value }) => value)).toStrictEqual([1, 0, 0, 0, 0, 0, 2])
    expect(points[0]?.start).toStrictEqual(new Date("2026-11-14T00:00:00.000Z"))
  })

  it("counts the last 30 days by default", async () => {
    const { points, total } = await executeQuery(userSignupsQuery())

    expect(total).toBe(4)
    expect(points).toHaveLength(30)
    expect(valueOn(points, "2026-11-13T00:00:00.000Z")).toBe(1)
  })

  it("counts the last 12 UTC months and leaves out older accounts", async () => {
    const { bucket, points, total } = await executeQuery(userSignupsQuery({ range: TIME_RANGE.LAST_12_MONTHS }))

    expect(bucket).toBe(TIME_BUCKET.MONTH)
    expect(total).toBe(5)
    expect(valueOn(points, "2026-06-01T00:00:00.000Z")).toBe(1)
    expect(valueOn(points, "2026-11-01T00:00:00.000Z")).toBe(4)
  })

  it("answers zero when nobody signed up in the period", async () => {
    await db.delete(user)

    const { points, total } = await executeQuery(userSignupsQuery())

    expect(total).toBe(0)
    expect(points.every(({ value }) => value === 0)).toBe(true)
  })

  it("rejects a caller without the permission to list users", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER }))

    await expect(executeQuery(userSignupsQuery())).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects a signed-out caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(executeQuery(userSignupsQuery())).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
