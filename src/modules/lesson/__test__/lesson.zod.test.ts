import { describe, expect, it } from "vite-plus/test"

import {
  LESSON_ACCESS,
  LESSON_DESCRIPTION_MAX_LENGTH,
  LESSON_KEY_MOMENTS_MAX_ITEMS,
  LESSON_STATUS,
} from "~/src/modules/lesson/lesson.constants"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"

const LESSON = {
  access: LESSON_ACCESS.PAID,
  description: { "en-US": "Read `README.md` first." },
  lessonId: "0195a2b4-6c8d-7e9f-8a0b-00000000c001",
  slug: "tour",
  status: LESSON_STATUS.PUBLISHED,
  summary: { "en-US": "A tour." },
  title: { "en-US": "Tour" },
}

const moment = (at: string, label = "Moment") => ({ at, label: { "en-US": label } })

describe("updateLesson", () => {
  it("reads key moment times as seconds and sorts the moments by time", () => {
    const parsed = lessonZodSchemas.updateLesson.parse({ ...LESSON, keyMoments: [moment("1:02:03", "Late"), moment("0:05", "Early")] })

    expect(parsed.keyMoments).toStrictEqual([
      { label: { "en-US": "Early" }, seconds: 5 },
      { label: { "en-US": "Late" }, seconds: 3723 },
    ])
  })

  it.each(["", "2", "2:75", "25:00:00"])("refuses the time %j", (at) => {
    expect(lessonZodSchemas.updateLesson.safeParse({ ...LESSON, keyMoments: [moment(at)] }).error?.issues[0]?.message).toBe("timeInvalid")
  })

  it("requires an English label and limits the number of moments and the description", () => {
    expect(
      lessonZodSchemas.updateLesson.safeParse({ ...LESSON, keyMoments: [{ at: "0:10", label: { "pl-PL": "Start" } }] }).error?.issues[0]
        ?.message,
    ).toBe("defaultLocaleRequired")
    expect(
      lessonZodSchemas.updateLesson.safeParse({
        ...LESSON,
        keyMoments: Array.from({ length: LESSON_KEY_MOMENTS_MAX_ITEMS + 1 }, () => moment("0:10")),
      }).error?.issues[0]?.message,
    ).toBe("tooManyKeyMoments")
    expect(
      lessonZodSchemas.updateLesson.safeParse({
        ...LESSON,
        description: { "en-US": "x".repeat(LESSON_DESCRIPTION_MAX_LENGTH + 1) },
        keyMoments: [],
      }).error?.issues[0]?.message,
    ).toBe("descriptionTooLong")
  })
})
