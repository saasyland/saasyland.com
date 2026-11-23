import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vite-plus/test"

import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL, COURSE_STATUS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS, LESSON_FORMAT, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"

import { LOCAL_UPLOAD_PHASE, type LocalVideoUpload } from "~/src/hooks/use-video-upload"

import { renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { CurriculumEditor } from "~/src/presentation/components/custom/admin/courses/curriculum-editor"

import labels from "~/messages/en-US/pages.admin.courses.json"

const localUpload = vi.hoisted(() => vi.fn<(lessonId: string) => LocalVideoUpload | undefined>())

vi.mock(import("~/src/hooks/use-video-upload"), async (importOriginal) => ({
  ...(await importOriginal()),
  useVideoUpload: (lessonId: string) => ({ cancel: vi.fn(), start: vi.fn(), upload: localUpload(lessonId) }),
}))

const COURSE_ID = "course"
const UPDATED_AT = new Date("2026-11-01T12:00:00Z")
const RECORDING = new File(["take"], "take.mp4", { type: "video/mp4" })

const lesson = (id: string, position: number): Course["editorLesson"] => ({
  access: LESSON_ACCESS.PAID,
  attachments: [],
  chapterId: "foundations",
  description: {},
  format: LESSON_FORMAT.VIDEO,
  id,
  keyMoments: [],
  position,
  slug: id,
  status: LESSON_STATUS.PUBLISHED,
  summary: { "en-US": id },
  title: { "en-US": id[0]?.toUpperCase() + id.slice(1) },
  upload: undefined,
  video: null,
})

const EDITOR: Course["editor"] = {
  chapters: [
    {
      id: "foundations",
      lessons: [lesson("boundaries", 1), lesson("sessions", 2)],
      position: 1,
      summary: {},
      title: { "en-US": "Foundations" },
    },
  ],
  course: {
    cover: null,
    createdAt: UPDATED_AT,
    icon: COURSE_ICON.ROCKET,
    id: COURSE_ID,
    kind: COURSE_KIND.COURSE,
    level: COURSE_LEVEL.BEGINNER,
    outcomes: {},
    position: 1,
    prerequisites: {},
    slug: "the-walkthrough",
    status: COURSE_STATUS.PUBLISHED,
    summary: { "en-US": "How it works." },
    title: { "en-US": "The walkthrough" },
    updatedAt: UPDATED_AT,
  },
}

describe("curriculum video badges", () => {
  it("shows the progress of an upload in this tab and an upload that stopped", () => {
    localUpload.mockImplementation((lessonId) => {
      if (lessonId === "boundaries") {
        return { file: RECORDING, phase: LOCAL_UPLOAD_PHASE.UPLOADING, uploadedBytes: 1 }
      }

      return { error: new Error("offline"), file: RECORDING, phase: LOCAL_UPLOAD_PHASE.FAILED, uploadedBytes: 0 }
    })

    renderAdmin(<CurriculumEditor editor={EDITOR} />, { path: `/admin/courses/${COURSE_ID}` })

    expect(screen.getByText("Uploading 25%")).toBeVisible()
    expect(screen.getByText(labels.curriculum.video.status.uploading)).toBeVisible()
  })
})
