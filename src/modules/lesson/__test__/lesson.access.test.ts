import { describe, expect, it } from "vite-plus/test"

import { GUEST, type Viewer, hasLessonAccess } from "~/src/modules/lesson/lesson.access"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

const ACCOUNT: Viewer = { isStaff: false, licensed: false, userId: "learner" }
const LICENSED: Viewer = { ...ACCOUNT, licensed: true }
const STAFF: Viewer = { ...ACCOUNT, isStaff: true }

describe("hasLessonAccess", () => {
  it.each([
    { access: LESSON_ACCESS.PREVIEW, expected: [true, true, true, true] },
    { access: LESSON_ACCESS.ACCOUNT, expected: [false, true, true, true] },
    { access: LESSON_ACCESS.PAID, expected: [false, false, true, true] },
  ])("grants a $access lesson to guest, account, licence and staff as $expected", ({ access, expected }) => {
    expect([GUEST, ACCOUNT, LICENSED, STAFF].map((viewer) => hasLessonAccess(access, viewer))).toStrictEqual(expected)
  })
})
