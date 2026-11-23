import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { COURSES_PURCHASE_EMAIL } from "~/src/data/courses.purchase-email"

import english from "~/messages/en-US/purchase-email.courses.json"
import polish from "~/messages/pl-PL/purchase-email.courses.json"
import { ROUTES } from "~/src/routes"

const holdsMock = vi.hoisted(() => vi.fn<(userId: string) => Promise<boolean>>())

vi.mock(import("~/src/data/course-access"), async (importOriginal) => ({ ...(await importOriginal()), holdsCourseAccess: holdsMock }))

const [courses] = COURSES_PURCHASE_EMAIL

beforeEach(() => {
  holdsMock.mockReset()
})

describe("the courses in the purchase confirmation", () => {
  it.each([
    ["en-US", english],
    ["pl-PL", polish],
  ] as const)("link a %s buyer whose licence includes the courses to them", async (locale, messages) => {
    holdsMock.mockResolvedValue(true)

    await expect(courses.lines({ locale, userId: "buyer-1" })).resolves.toStrictEqual([
      { link: messages.link, pathname: ROUTES.COURSES, text: messages.text },
    ])
    expect(holdsMock).toHaveBeenCalledExactlyOnceWith("buyer-1")
  })

  it("add nothing for a buyer whose licence does not include them", async () => {
    holdsMock.mockResolvedValue(false)

    await expect(courses.lines({ locale: "en-US", userId: "buyer-2" })).resolves.toStrictEqual([])
  })
})
